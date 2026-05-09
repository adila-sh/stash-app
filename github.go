package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// githubClientID identifica o OAuth App registrado no /ide.
// Para apps desktop o Client ID não é segredo (Device Flow não usa client_secret).
const githubClientID = "Ov23liin2A54us9DvIoX"

const (
	githubDeviceCodeURL  = "https://github.com/login/device/code"
	githubAccessTokenURL = "https://github.com/login/oauth/access_token"
	githubAPIBase        = "https://api.github.com"
	githubTokenKey       = "github.token"
)

type GitHubUser struct {
	Login       string `json:"login"`
	Name        string `json:"name"`
	AvatarURL   string `json:"avatarUrl"`
	Bio         string `json:"bio"`
	Company     string `json:"company"`
	Location    string `json:"location"`
	Blog        string `json:"blog"`
	Email       string `json:"email"`
	HTMLURL     string `json:"htmlUrl"`
	PublicRepos int    `json:"publicRepos"`
	Followers   int    `json:"followers"`
	Following   int    `json:"following"`
	CreatedAt   string `json:"createdAt"`
}

type DeviceFlowStart struct {
	UserCode        string `json:"userCode"`
	VerificationURI string `json:"verificationUri"`
	DeviceCode      string `json:"deviceCode"`
	Interval        int    `json:"interval"`
	ExpiresIn       int    `json:"expiresIn"`
}

type GitHubUserRepo struct {
	Name        string `json:"name"`
	FullName    string `json:"fullName"`
	Description string `json:"description"`
	HTMLURL     string `json:"htmlUrl"`
	CloneURL    string `json:"cloneUrl"`
	Language    string `json:"language"`
	Stars       int    `json:"stars"`
	Forks       int    `json:"forks"`
	UpdatedAt   string `json:"updatedAt"`
	Private     bool   `json:"private"`
	Fork        bool   `json:"fork"`
	Archived    bool   `json:"archived"`
}

type GitHub struct {
	ctx    context.Context
	cfg    *Config
	client *http.Client

	mu       sync.Mutex
	pollStop chan struct{}
}

func NewGitHub(cfg *Config) *GitHub {
	return &GitHub{
		cfg:    cfg,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (g *GitHub) startup(ctx context.Context) {
	g.ctx = ctx
}

// ── Token ─────────────────────────────────────────────────────────────────────

func (g *GitHub) token() string {
	if g.cfg == nil {
		return ""
	}
	v := g.cfg.Get(githubTokenKey, "")
	s, _ := v.(string)
	return s
}

func (g *GitHub) IsAuthenticated() bool {
	return g.token() != ""
}

func (g *GitHub) Logout() error {
	if g.cfg == nil {
		return nil
	}
	g.cancelPolling()
	if err := g.cfg.Reset(githubTokenKey); err != nil {
		return err
	}
	emit("github.changed")
	return nil
}

func (g *GitHub) cancelPolling() {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.pollStop != nil {
		close(g.pollStop)
		g.pollStop = nil
	}
}

// ── Device Flow ───────────────────────────────────────────────────────────────

// StartDeviceFlow inicia o fluxo OAuth Device Flow do GitHub.
func (g *GitHub) StartDeviceFlow() (DeviceFlowStart, error) {
	form := url.Values{}
	form.Set("client_id", githubClientID)
	form.Set("scope", "repo notifications")

	req, err := http.NewRequestWithContext(g.ctx, "POST", githubDeviceCodeURL, strings.NewReader(form.Encode()))
	if err != nil {
		return DeviceFlowStart{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := g.client.Do(req)
	if err != nil {
		return DeviceFlowStart{}, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return DeviceFlowStart{}, fmt.Errorf("github device code: %s — %s", resp.Status, strings.TrimSpace(string(body)))
	}

	var raw struct {
		DeviceCode      string `json:"device_code"`
		UserCode        string `json:"user_code"`
		VerificationURI string `json:"verification_uri"`
		ExpiresIn       int    `json:"expires_in"`
		Interval        int    `json:"interval"`
		Error           string `json:"error"`
		ErrorDesc       string `json:"error_description"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return DeviceFlowStart{}, fmt.Errorf("github device code: resposta inválida: %w", err)
	}
	if raw.Error != "" {
		return DeviceFlowStart{}, fmt.Errorf("github device code: %s — %s", raw.Error, raw.ErrorDesc)
	}
	if raw.Interval <= 0 {
		raw.Interval = 5
	}

	// Abre o navegador automaticamente para o usuário não precisar copiar a URL.
	openBrowser(raw.VerificationURI)

	return DeviceFlowStart{
		DeviceCode:      raw.DeviceCode,
		UserCode:        raw.UserCode,
		VerificationURI: raw.VerificationURI,
		Interval:        raw.Interval,
		ExpiresIn:       raw.ExpiresIn,
	}, nil
}

// PollDeviceToken faz polling até GitHub aprovar (ou expirar). Quando aprovado,
// armazena o token via Config e emite "github.changed".
func (g *GitHub) PollDeviceToken(deviceCode string, interval int) error {
	if deviceCode == "" {
		return errors.New("device_code vazio")
	}
	if interval <= 0 {
		interval = 5
	}

	g.mu.Lock()
	if g.pollStop != nil {
		close(g.pollStop)
	}
	stop := make(chan struct{})
	g.pollStop = stop
	g.mu.Unlock()

	wait := time.Duration(interval) * time.Second
	deadline := time.Now().Add(15 * time.Minute)

	for {
		if time.Now().After(deadline) {
			return errors.New("device flow: tempo esgotado")
		}
		select {
		case <-g.ctx.Done():
			return g.ctx.Err()
		case <-stop:
			return errors.New("device flow: cancelado")
		case <-time.After(wait):
		}

		token, slowDown, pending, err := g.exchangeDeviceCode(deviceCode)
		if err != nil {
			return err
		}
		if slowDown {
			wait += 5 * time.Second
			continue
		}
		if pending {
			continue
		}
		if token != "" {
			if err := g.cfg.Set(githubTokenKey, token); err != nil {
				return err
			}
			emit("github.changed")
			g.mu.Lock()
			if g.pollStop == stop {
				g.pollStop = nil
			}
			g.mu.Unlock()
			return nil
		}
	}
}

func (g *GitHub) CancelDeviceFlow() {
	g.cancelPolling()
}

func (g *GitHub) exchangeDeviceCode(deviceCode string) (token string, slowDown, pending bool, err error) {
	form := url.Values{}
	form.Set("client_id", githubClientID)
	form.Set("device_code", deviceCode)
	form.Set("grant_type", "urn:ietf:params:oauth:grant-type:device_code")

	req, e := http.NewRequestWithContext(g.ctx, "POST", githubAccessTokenURL, strings.NewReader(form.Encode()))
	if e != nil {
		return "", false, false, e
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, e := g.client.Do(req)
	if e != nil {
		return "", false, false, e
	}
	defer resp.Body.Close()

	var raw struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if e := json.NewDecoder(resp.Body).Decode(&raw); e != nil {
		return "", false, false, fmt.Errorf("github token: resposta inválida: %w", e)
	}

	switch raw.Error {
	case "":
		return raw.AccessToken, false, false, nil
	case "authorization_pending":
		return "", false, true, nil
	case "slow_down":
		return "", true, false, nil
	default:
		return "", false, false, fmt.Errorf("github device flow: %s — %s", raw.Error, raw.ErrorDesc)
	}
}

// ── REST API ──────────────────────────────────────────────────────────────────

func (g *GitHub) apiRequest(method, path string, body any) (*http.Response, error) {
	tok := g.token()
	if tok == "" {
		return nil, errors.New("não autenticado no GitHub")
	}

	var rdr io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		rdr = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(g.ctx, method, githubAPIBase+path, rdr)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+tok)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return g.client.Do(req)
}

func (g *GitHub) GetUser() (GitHubUser, error) {
	resp, err := g.apiRequest("GET", "/user", nil)
	if err != nil {
		return GitHubUser{}, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return GitHubUser{}, fmt.Errorf("github /user: %s — %s", resp.Status, strings.TrimSpace(string(body)))
	}
	var raw struct {
		Login       string `json:"login"`
		Name        string `json:"name"`
		AvatarURL   string `json:"avatar_url"`
		Bio         string `json:"bio"`
		Company     string `json:"company"`
		Location    string `json:"location"`
		Blog        string `json:"blog"`
		Email       string `json:"email"`
		HTMLURL     string `json:"html_url"`
		PublicRepos int    `json:"public_repos"`
		Followers   int    `json:"followers"`
		Following   int    `json:"following"`
		CreatedAt   string `json:"created_at"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return GitHubUser{}, err
	}
	return GitHubUser{
		Login: raw.Login, Name: raw.Name, AvatarURL: raw.AvatarURL,
		Bio: raw.Bio, Company: raw.Company, Location: raw.Location,
		Blog: raw.Blog, Email: raw.Email, HTMLURL: raw.HTMLURL,
		PublicRepos: raw.PublicRepos, Followers: raw.Followers,
		Following: raw.Following, CreatedAt: raw.CreatedAt,
	}, nil
}

// ListMyRepos retorna até `limit` repos do usuário ordenados por update recente.
func (g *GitHub) ListMyRepos(limit int) ([]GitHubUserRepo, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	resp, err := g.apiRequest(
		"GET",
		fmt.Sprintf("/user/repos?sort=updated&per_page=%d&affiliation=owner,collaborator", limit),
		nil,
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("github /user/repos: %s — %s", resp.Status, strings.TrimSpace(string(body)))
	}
	var raw []struct {
		Name        string `json:"name"`
		FullName    string `json:"full_name"`
		Description string `json:"description"`
		HTMLURL     string `json:"html_url"`
		CloneURL    string `json:"clone_url"`
		Language    string `json:"language"`
		Stars       int    `json:"stargazers_count"`
		Forks       int    `json:"forks_count"`
		UpdatedAt   string `json:"updated_at"`
		Private     bool   `json:"private"`
		Fork        bool   `json:"fork"`
		Archived    bool   `json:"archived"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	out := make([]GitHubUserRepo, 0, len(raw))
	for _, r := range raw {
		out = append(out, GitHubUserRepo{
			Name: r.Name, FullName: r.FullName, Description: r.Description,
			HTMLURL: r.HTMLURL, CloneURL: r.CloneURL, Language: r.Language,
			Stars: r.Stars, Forks: r.Forks, UpdatedAt: r.UpdatedAt,
			Private: r.Private, Fork: r.Fork, Archived: r.Archived,
		})
	}
	return out, nil
}

// PullRequestInfo é o que devolvemos depois de criar (ou abrir) um PR.
type PullRequestInfo struct {
	Number  int    `json:"number"`
	HTMLURL string `json:"htmlUrl"`
	Title   string `json:"title"`
	State   string `json:"state"`
	Head    string `json:"head"`
	Base    string `json:"base"`
}

// CreatePullRequest abre um pull request em owner/repo do head para a base.
func (g *GitHub) CreatePullRequest(owner, repo, base, head, title, body string) (*PullRequestInfo, error) {
	if owner == "" || repo == "" || base == "" || head == "" || title == "" {
		return nil, errors.New("parâmetros incompletos para criar PR")
	}
	payload := map[string]any{
		"title": title,
		"head":  head,
		"base":  base,
		"body":  body,
	}
	resp, err := g.apiRequest("POST", "/repos/"+owner+"/"+repo+"/pulls", payload)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 201 {
		return nil, fmt.Errorf("github criar PR: %s — %s", resp.Status, strings.TrimSpace(string(bodyBytes)))
	}
	var raw struct {
		Number  int    `json:"number"`
		HTMLURL string `json:"html_url"`
		Title   string `json:"title"`
		State   string `json:"state"`
		Head    struct {
			Ref string `json:"ref"`
		} `json:"head"`
		Base struct {
			Ref string `json:"ref"`
		} `json:"base"`
	}
	if err := json.Unmarshal(bodyBytes, &raw); err != nil {
		return nil, err
	}
	return &PullRequestInfo{
		Number:  raw.Number,
		HTMLURL: raw.HTMLURL,
		Title:   raw.Title,
		State:   raw.State,
		Head:    raw.Head.Ref,
		Base:    raw.Base.Ref,
	}, nil
}

// PickCloneDirectory abre o dialog nativo de seleção de pasta — útil para o
// frontend antes de chamar CloneRepo.
func (g *GitHub) PickCloneDirectory() (string, error) {
	return pickDirectory("Escolha onde clonar")
}

// CloneProgress descreve o estado de uma operação de clone em andamento.
// Emitido pelo backend via evento "github:clone-progress" para cada repositório.
type CloneProgress struct {
	CloneURL string `json:"cloneUrl"`
	Phase    string `json:"phase"`
	Percent  int    `json:"percent"`
	Done     bool   `json:"done"`
	Error    string `json:"error,omitempty"`
}

// gitProgressLine casa linhas como "Receiving objects:  45% (123/456), 1.23 MiB | ...".
var gitProgressLine = regexp.MustCompile(`^([A-Za-z][A-Za-z ]+?):\s+(\d+)%`)

// CloneRepo clona um repositório do GitHub para parentDir/name. Injeta o token
// na URL HTTPS para repositórios privados funcionarem sem prompt. Emite
// eventos "github:clone-progress" durante a operação.
func (g *GitHub) CloneRepo(cloneURL, parentDir, name string) (string, error) {
	cloneURL = strings.TrimSpace(cloneURL)
	parentDir = strings.TrimSpace(parentDir)
	name = strings.TrimSpace(name)
	if cloneURL == "" {
		return "", errors.New("URL de clone vazia")
	}
	if parentDir == "" {
		return "", errors.New("pasta de destino não informada")
	}
	if name == "" {
		return "", errors.New("nome do repositório vazio")
	}
	if strings.ContainsAny(name, `/\`) || name == "." || name == ".." {
		return "", fmt.Errorf("nome inválido: %q", name)
	}

	absParent, err := filepath.Abs(parentDir)
	if err != nil {
		return "", fmt.Errorf("caminho inválido: %w", err)
	}
	info, err := os.Stat(absParent)
	if err != nil {
		return "", fmt.Errorf("pasta de destino não acessível: %w", err)
	}
	if !info.IsDir() {
		return "", fmt.Errorf("destino não é uma pasta: %s", absParent)
	}

	dest := filepath.Join(absParent, name)
	if _, err := os.Stat(dest); err == nil {
		return "", fmt.Errorf("já existe %s", dest)
	}

	authedURL := injectTokenIntoURL(cloneURL, g.token())

	ctx := g.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	cmd := exec.CommandContext(ctx, "git", "clone", "--progress", "--", authedURL, dest)
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return "", fmt.Errorf("git clone: %w", err)
	}

	emit("github:clone-progress", CloneProgress{CloneURL: cloneURL, Phase: "Iniciando", Percent: 0})

	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("git clone: %w", err)
	}

	var errBuf bytes.Buffer
	scanner := bufio.NewScanner(stderr)
	scanner.Buffer(make([]byte, 0, 4096), 64*1024)
	// Split em \n e \r para capturar atualizações inline de progresso do git.
	scanner.Split(splitProgressLines)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		errBuf.WriteString(line)
		errBuf.WriteByte('\n')
		if m := gitProgressLine.FindStringSubmatch(line); m != nil {
			phase := strings.TrimSpace(m[1])
			percent := 0
			fmt.Sscanf(m[2], "%d", &percent)
			emit("github:clone-progress", CloneProgress{
				CloneURL: cloneURL,
				Phase:    phase,
				Percent:  percent,
			})
		}
	}

	if err := cmd.Wait(); err != nil {
		msg := strings.TrimSpace(errBuf.String())
		if tok := g.token(); tok != "" {
			msg = strings.ReplaceAll(msg, tok, "***")
		}
		if msg == "" {
			msg = err.Error()
		}
		emit("github:clone-progress", CloneProgress{
			CloneURL: cloneURL,
			Phase:    "Erro",
			Done:     true,
			Error:    msg,
		})
		return "", fmt.Errorf("git clone falhou: %s", msg)
	}

	emit("github:clone-progress", CloneProgress{
		CloneURL: cloneURL,
		Phase:    "Concluído",
		Percent:  100,
		Done:     true,
	})
	return dest, nil
}

// splitProgressLines é um SplitFunc que quebra em \n ou \r — necessário para
// capturar atualizações de progresso do git, que sobrescrevem a linha atual
// usando carriage return em vez de newline.
func splitProgressLines(data []byte, atEOF bool) (advance int, token []byte, err error) {
	if atEOF && len(data) == 0 {
		return 0, nil, nil
	}
	for i, b := range data {
		if b == '\n' || b == '\r' {
			return i + 1, data[:i], nil
		}
	}
	if atEOF {
		return len(data), data, nil
	}
	return 0, nil, nil
}

func injectTokenIntoURL(cloneURL, token string) string {
	if token == "" {
		return cloneURL
	}
	u, err := url.Parse(cloneURL)
	if err != nil || u.Scheme != "https" {
		return cloneURL
	}
	if u.User != nil {
		return cloneURL
	}
	u.User = url.UserPassword("x-access-token", token)
	return u.String()
}
