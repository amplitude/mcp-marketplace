# Amplitude MCP Marketplace

Open-source plugins and skills for [Amplitude](https://amplitude.com) MCP users. Turn your AI coding assistant into a product analytics powerhouse.

Works with **Claude Code**, **Cursor**, and **Claude**.

---

## What's Inside

| Plugin | Description |
|--------|-------------|
| [amplitude](./plugins/amplitude/) | Reusable analysis skills – chart creation, dashboard creation, chart analysis, dashboard reviews, experiment analysis, experiment monitoring, opportunity discovery, feedback synthesis, account health, daily and weekly briefs |

---

## Quick Start

Installing on Claude:
```bash
# Add the Amplitude marketplace (one-time)
/plugin marketplace add amplitude/mcp-marketplace

# Install the amplitude plugin
/plugin install amplitude@amplitude
```

Installing on Cursor:
- Go to cursor settings
- Click on Plugins
- Look for the Amplitude Analytics plugin
- Install the plugin
- You can test if the skills exist by typing /
- For the skills to work you need to have the amplitude MCP server
- You can add the MCP server to cursor by going to agent settings
- Agent settings -> Tools & MCP -> Add a new MCP server
- Add the following server to the config:
    "amplitude-us": {
        "command": "npx",
        "args": [
            "-y",
            "mcp-remote",
            "https://mcp-server.prod.us-west-2.amplitude.com/v1/mcp"
        ]
    }
- This should take you to the browser to complete the 0Auth flow

---

## Repository Structure

```
.claude-plugin/
  marketplace.json        # Marketplace catalog
plugins/
  amplitude/
    .claude-plugin/
      plugin.json         # Plugin manifest
    skills/
      analyze-account-health/
      analyze-chart/
      analyze-dashboard/
      analyze-experiment/
      analyze-feedback/
      create-chart/
      create-dashboard/
      daily-brief/
      discover-opportunities/
      monitor-experiments/
      weekly-brief/
    README.md
```

---

## Requirements

- **MCP-compatible client** – Claude Code, Cursor, or Claude
- **Amplitude account** with API access
- **Node.js** – For the MCP server

---

## Contributing

We welcome contributions! Whether it's a new skill or improvement:

1. Fork this repo
2. Create a new branch for your feature
3. Follow the existing patterns in `plugins/` for structure
4. Submit a PR with a clear description

---

## Resources

- [Amplitude Docs](https://amplitude.com/docs)
- [MCP Protocol](https://modelcontextprotocol.io/)

---

## License

MIT

---

## Support

- **Issues**: [GitHub Issues](https://github.com/amplitude/mcp-marketplace/issues)
- **Amplitude**: [amplitude.com](https://amplitude.com)
