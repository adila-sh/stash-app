package main

import (
	"fmt"

	"github.com/pkg/browser"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// emit dispara um evento custom para o frontend.
func emit(name string, data ...any) {
	app := application.Get()
	if app == nil {
		return
	}
	app.Event.Emit(name, data...)
}

func logErrorf(format string, args ...any) {
	if app := application.Get(); app != nil {
		app.Logger.Error(fmt.Sprintf(format, args...))
	}
}

// openBrowser abre uma URL no navegador padrão. Usa pkg/browser pois o
// app.Browser.OpenURL do Wails v3 falha silenciosamente em alguns ambientes
// Linux (WebKitGTK).
func openBrowser(url string) {
	if err := browser.OpenURL(url); err != nil {
		logErrorf("openBrowser: %v", err)
	}
}

// pickDirectory abre o dialog nativo de seleção de pasta.
func pickDirectory(title string) (string, error) {
	app := application.Get()
	if app == nil {
		return "", fmt.Errorf("application not ready")
	}
	return app.Dialog.OpenFile().
		CanChooseDirectories(true).
		CanChooseFiles(false).
		SetTitle(title).
		PromptForSingleSelection()
}
