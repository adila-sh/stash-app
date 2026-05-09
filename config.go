package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// Config persiste configurações do usuário em ~/.config/adila/settings.json.
// Compartilha o mesmo arquivo com o /ide para que o token do GitHub feito ali
// seja reaproveitado aqui (e vice-versa). Thread-safe; salva com debounce.
type Config struct {
	ctx    context.Context
	mu     sync.RWMutex
	data   map[string]any
	path   string
	saveCh chan struct{}
}

func NewConfig() *Config {
	return &Config{
		data:   make(map[string]any),
		saveCh: make(chan struct{}, 1),
	}
}

func (c *Config) startup(ctx context.Context) {
	c.ctx = ctx
	if path, err := settingsFilePath(); err == nil {
		c.path = path
		c.load()
	}
	go c.saveLoop()
}

func (c *Config) shutdown(_ context.Context) {
	c.flush()
}

func (c *Config) load() {
	raw, err := os.ReadFile(c.path)
	if err != nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	_ = json.Unmarshal(raw, &c.data)
}

func (c *Config) flush() {
	c.mu.RLock()
	snap := make(map[string]any, len(c.data))
	for k, v := range c.data {
		snap[k] = v
	}
	c.mu.RUnlock()

	if c.path == "" {
		return
	}
	b, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(c.path, b, 0o644)
}

func (c *Config) saveLoop() {
	const debounce = 400 * time.Millisecond
	timer := time.NewTimer(debounce)
	timer.Stop()

	for {
		select {
		case <-c.saveCh:
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			timer.Reset(debounce)
		case <-timer.C:
			c.flush()
		case <-c.ctx.Done():
			c.flush()
			return
		}
	}
}

func (c *Config) scheduleSave() {
	select {
	case c.saveCh <- struct{}{}:
	default:
	}
}

func (c *Config) Get(key string, defaultValue any) any {
	c.mu.RLock()
	v, ok := c.data[key]
	c.mu.RUnlock()
	if !ok {
		return defaultValue
	}
	return v
}

func (c *Config) Set(key string, value any) error {
	c.mu.Lock()
	c.data[key] = value
	c.mu.Unlock()
	c.scheduleSave()
	if c.ctx != nil {
		emit("config.changed", map[string]any{"key": key, "value": value})
	}
	return nil
}

func (c *Config) Reset(key string) error {
	c.mu.Lock()
	delete(c.data, key)
	c.mu.Unlock()
	c.scheduleSave()
	if c.ctx != nil {
		emit("config.changed", map[string]any{"key": key, "value": nil})
	}
	return nil
}

func settingsFilePath() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(base, "adila")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return filepath.Join(dir, "settings.json"), nil
}
