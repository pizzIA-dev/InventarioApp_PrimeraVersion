import os
import sys

path = r'd:\PROYECTOPROGRAMACION\ProyectoInventario\frontend\src\pages\Ventas.jsx'
if not os.path.exists(path):
    print(f"File not found: {path}")
    sys.exit(1)

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract the modal code that is outside
import re
modal_pattern = r'\{\/\* Modal de Detalle de Venta \*\/\}[\s\S]*?\{detailModalVisible && selectedVentaForDetail && \([\s\S]*?\}\)'
match = re.search(modal_pattern, content)

if match:
    modal_code = match.group(0)
    # Remove the modal code from its current position
    content = content.replace(modal_code, '')
    
    # 2. Find the last </div> before the final return closing ); }
    # Look for the end of the component
    # It looks like:
    #       <ClienteFormModal ... />
    #     </div>
    #   );
    # }
    insert_pattern = r'(<ClienteFormModal[\s\S]*?\/>\s*?)(<\/div>\s*?\);\s*?\}|);'
    # Actually, let's just find the last </div> of the main return
    # The view_file showed:
    # 1250:       />
    # 1251:     </div>
    # 1252:   );
    # 1253: }
    
    parts = content.split('  );')
    if len(parts) > 1:
        # The last part before '  );' should end with '    </div>'
        last_before_return = parts[-2]
        if '    </div>' in last_before_return:
            # Insert modal code before the last </div>
            last_div_index = last_before_return.rfind('    </div>')
            new_last_part = last_before_return[:last_div_index] + '\n      ' + modal_code + '\n' + last_before_return[last_div_index:]
            parts[-2] = new_last_part
            content = '  );'.join(parts)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("SUCCESS: Modal moved inside component")
        else:
            print("DEBUG: Could not find last </div> in the return block")
    else:
        print("DEBUG: Could not find return ending ');' ")
else:
    print("DEBUG: Modal code not found")
