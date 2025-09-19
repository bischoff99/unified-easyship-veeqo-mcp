# 🚀 Connecting MCP Server to Cursor IDE

## Step 1: Copy MCP Configuration

Copy the `cursor-mcp-config.json` file to your Cursor IDE configuration:

```bash
# Create Cursor config directory if it doesn't exist
mkdir -p ~/.cursor

# Copy the MCP configuration
cp cursor-mcp-config.json ~/.cursor/mcp_settings.json
```

## Step 2: Restart Cursor IDE

1. Close Cursor IDE completely
2. Reopen Cursor IDE
3. The MCP server should now be connected

## Step 3: Test the Interactive Prompt

### Method 1: Use Cursor's MCP Integration

1. Open Cursor IDE
2. Look for MCP tools/prompts in the sidebar
3. Find "process_order_data" prompt
4. Test the interactive workflow

### Method 2: Use Cursor Chat

1. Open Cursor Chat (Ctrl+L or Cmd+L)
2. Type: "Use the process_order_data prompt with interactive mode"
3. Follow the interactive workflow

## Step 4: Test Parameters

Use this exact order data for testing:

```
California	FEDEX	Mariano duque	velazquez	+34678543875	mariano005@proton.me	Avenida San Carlos, portal ibensa 1, apartamento 3		Benalmadena	Malaga	29630	Spain	FALSE	7.6 lbs
```

### Interactive Workflow Steps:

**Step 1: Initial Processing**

- Call: `process_order_data(order_data, interactive_mode: true)`
- Result: Shows FedEx rates with selection options

**Step 2: Rate Selection**

- Call: `process_order_data(order_data, interactive_mode: true, selected_rate_id: "rate_1")`
- Result: Shows rate confirmation

**Step 3: Purchase Confirmation**

- Call: `process_order_data(order_data, interactive_mode: true, selected_rate_id: "rate_1", purchase_confirmation: "yes")`
- Result: Creates shipping label (mock mode)

## Step 5: Verify Connection

Check if the MCP server is connected:

1. Look for MCP tools in Cursor's interface
2. Try calling the prompt
3. Check Cursor's logs for MCP connection status

## Troubleshooting

If the connection doesn't work:

1. Ensure the MCP server is running: `ps aux | grep "node dist/server.js"`
2. Check the configuration file path
3. Restart Cursor IDE
4. Check Cursor's MCP logs

## Current Server Status

The MCP server is running with:

- ✅ Enhanced interactive order processing prompt
- ✅ FedEx validation and rate display
- ✅ Mock API keys (safe for testing)
- ✅ Complete purchase workflow

Ready for testing! 🎉
