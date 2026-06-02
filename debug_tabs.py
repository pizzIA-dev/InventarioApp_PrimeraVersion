PATH = r'frontend\src\pages\Transacciones.jsx'
with open(PATH, encoding='utf-8', errors='replace') as f:
    content = f.read()

# Normalize line endings  
content = content.replace('\r\n', '\n')

# Find the start of the tabs block
start_marker = '      {/* ── Tabs'
end_marker = '      </div>\n'  # The closing div of the card

# Find start
start = content.find(start_marker)
if start == -1:
    print("Start marker not found")
    exit()

print(f"Start at {start}: {repr(content[start:start+50])}")

# Find the card div start and its ending </div>
# From start, find '</div>\n      </div>' (card closing)
card_end = content.find('</div>\n      </div>\n\n      {/* ── Filter Bar', start)
if card_end == -1:
    # Try different end
    card_end = content.find('</div>\n\n      {/* ── Filter Bar', start)
    
if card_end == -1:
    print("Card end not found - looking for next section")
    # Find the next filter bar comment
    next_section = content.find('Filter Bar', start)
    print(f"Filter Bar at: {next_section}")
    print(f"Context: {repr(content[next_section-50:next_section+50])}")
else:
    # Replace the old tabs block
    old_block = content[start:card_end + len('</div>\n      </div>')]
    print(f"Old block length: {len(old_block)}")
    print(f"Old block start: {repr(old_block[:80])}")
    print(f"Old block end: {repr(old_block[-80:])}")