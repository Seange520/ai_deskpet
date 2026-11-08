import asyncio,os,json,pathlib
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
async def main():
 env=dict(os.environ,BLENDER_HOST='localhost',BLENDER_PORT='9876',DISABLE_TELEMETRY='true')
 params=StdioServerParameters(command=r'C:\Users\Senage\AppData\Local\uv\cache\archive-v0\rNf4cn70RGPSIqW3\Scripts\mcp-for-blender.exe',env=env)
 async with stdio_client(params) as (rd,wr):
  async with ClientSession(rd,wr) as session:
   await session.initialize()
   result=await session.call_tool('execute_blender_code',{'code':pathlib.Path('scripts/blender-steps.py').read_text(encoding='utf-8')})
   target=pathlib.Path(r'C:\Users\Senage\.codex\visualizations\2026\11\07\01a1b693-ded6-7e71-9e57-3be30f4fe3f6\sparkmate-light-rail');target.mkdir(exist_ok=True)
   (target/'blender-result.json').write_text(result.model_dump_json(),encoding='utf-8')
   print('MCP_ERROR',result.isError)
   for c in result.content:
    if hasattr(c,'text'):print(c.text[-1600:])
asyncio.run(main())
