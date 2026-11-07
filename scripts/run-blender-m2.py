import asyncio,os,pathlib,json
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
async def main():
 params=StdioServerParameters(command=r"C:\Users\Senage\AppData\Local\uv\cache\archive-v0\rNf4cn70RGPSIqW3\Scripts\mcp-for-blender.exe",env=dict(os.environ,BLENDER_HOST="localhost",BLENDER_PORT="9876",DISABLE_TELEMETRY="true"))
 async with stdio_client(params) as (r,w):
  async with ClientSession(r,w) as session:
   await session.initialize()
   result=await session.call_tool('get_scene_info',{'user_prompt':'Read-only Blender MCP connectivity inspection. Final asset export uses the guarded isolated background script.'})
   pathlib.Path('public/assets/models/blender-mcp-result.json').write_text(result.model_dump_json(),encoding='utf8')
   print(result)
asyncio.run(main())
