with open(r'frontend\src\pages\Transacciones.jsx', 'rb') as f:
    raw = f.read()

# Decode
content = raw.decode('utf-8', errors='replace')

# Find line 587 start (0-indexed: 586)
lines = content.split('\n')
print(f"Total lines: {len(lines)}")
print(f"Line 587: {repr(lines[586])}")
print(f"Line 588: {repr(lines[587])}")
print(f"Line 620: {repr(lines[619])}")
print(f"Line 621: {repr(lines[620])}")
print(f"Line 622: {repr(lines[621])}")