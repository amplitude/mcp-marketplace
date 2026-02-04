# Amplitude MCP Marketplace

Open-source plugins and skills for [Amplitude](https://amplitude.com) MCP users. Turn your AI coding assistant into a product analytics powerhouse.

Works with **Claude Code**, **Cursor**, and **Claude**.

---

## What's Inside

| Plugin | Description |
|--------|-------------|
| [amplitude-analysis](./plugins/amplitude-analysis/) | Reusable analysis skills – chart creation, dashboard creation, chart analysis, dashboard reviews, experiment analysis, feedback synthesis, account health |

---

## Quick Start

```bash
# Add the Amplitude marketplace (one-time)
/plugin marketplace add amplitude/mcp-marketplace

# Install the amplitude-analysis plugin
/plugin install amplitude-analysis@amplitude
```

---

## Repository Structure

```
.claude-plugin/
  marketplace.json        # Marketplace catalog
plugins/
  amplitude-analysis/
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
