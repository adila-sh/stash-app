package main

import (
	"context"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func (c *Config) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
	c.startup(ctx)
	return nil
}

func (c *Config) ServiceShutdown() error {
	c.shutdown(context.Background())
	return nil
}

func (g *GitHub) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
	g.startup(ctx)
	return nil
}
