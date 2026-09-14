with open("server.ts", "r") as f:
    code = f.read()

lines = code.split('\n')
new_lines = []
for line in lines:
    if 'ytdl_core_static' in line or 'ytdl.getInfo' in line or 'ytdl.chooseFormat' in line or 'ytdl.validateURL' in line:
        continue
    new_lines.append(line)

code = '\n'.join(new_lines)

with open("server.ts", "w") as f:
    f.write(code)

print("Cleaned server.ts successfully")
