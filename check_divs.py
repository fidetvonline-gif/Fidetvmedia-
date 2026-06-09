
import re

def check_div_balance(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    stack = []
    line_num = 0
    for line in lines:
        line_num += 1
        # Find all <div or </div>
        # This is a bit naive because of strings and comments, 
        # but let's see if it finds something obvious.
        
        # Strip comments
        line = re.sub(r'//.*', '', line)
        line = re.sub(r'{/\*.*?\*/}', '', line)
        
        # Skip template strings (roughly)
        if '`' in line:
            # If line has even number of backticks, they are probably self-contained
            if line.count('`') % 2 != 0:
                # This is hard to handle in a simple script
                pass

        tags = re.findall(r'<(div|/div)', line)
        for tag in tags:
            if tag == 'div':
                stack.append(line_num)
            else:
                if not stack:
                    print(f"Error: </div> on line {line_num} has no matching <div")
                else:
                    stack.pop()
    
    print(f"Finished. Stack size: {len(stack)}")
    if stack:
        print(f"Unclosed <div> tags from lines: {stack[:20]}...")

check_div_balance('src/pages/Admin.tsx')
