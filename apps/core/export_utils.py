"""
Utilidad centralizada para exportar datos a Excel (.xlsx) con filtros de período.
Formato soportado: Trimestral, Semestral, Anual, Todo
"""

import io
from datetime import date, datetime
from django.http import HttpResponse
from django.utils import timezone

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False


# ─── Header color (dark green/teal matching the app's color palette) ───────────
HEADER_FILL = "1a5276"
HEADER_FONT_COLOR = "FFFFFF"
ALT_ROW_FILL = "eaf4fb"


def get_period_range(periodo: str, anio: int | None = None):
    """
    Returns (date_from, date_to) for the given period string.
    periodo: 'trimestre1', 'trimestre2', 'trimestre3', 'trimestre4',
             'semestre1', 'semestre2', 'anual', 'todo'
    """
    year = anio or timezone.now().year

    ranges = {
        'trimestre1': (date(year, 1, 1),  date(year, 3, 31)),
        'trimestre2': (date(year, 4, 1),  date(year, 6, 30)),
        'trimestre3': (date(year, 7, 1),  date(year, 9, 30)),
        'trimestre4': (date(year, 10, 1), date(year, 12, 31)),
        'semestre1':  (date(year, 1, 1),  date(year, 6, 30)),
        'semestre2':  (date(year, 7, 1),  date(year, 12, 31)),
        'anual':      (date(year, 1, 1),  date(year, 12, 31)),
    }
    return ranges.get(periodo)  # Returns None when period is 'todo'


def get_period_label(periodo: str, anio: int | None = None) -> str:
    year = anio or timezone.now().year
    labels = {
        'trimestre1': f"T1 {year} (Ene–Mar)",
        'trimestre2': f"T2 {year} (Abr–Jun)",
        'trimestre3': f"T3 {year} (Jul–Sep)",
        'trimestre4': f"T4 {year} (Oct–Dic)",
        'semestre1':  f"1er Semestre {year} (Ene–Jun)",
        'semestre2':  f"2do Semestre {year} (Jul–Dic)",
        'anual':      f"Año {year} (Completo)",
        'todo':       "Historial Completo",
    }
    return labels.get(periodo, "Historial")


def create_excel_response(filename: str, sheet_name: str, headers: list,
                          rows: list, title: str, period_label: str) -> HttpResponse:
    """
    Creates an HttpResponse containing a styled .xlsx workbook.

    - filename: e.g. 'productos.xlsx'
    - sheet_name: e.g. 'Productos'
    - headers: list of column header strings
    - rows: list of tuples / lists with row data
    - title: big title shown in row 1
    - period_label: human-readable period string shown in row 2
    """
    if not OPENPYXL_AVAILABLE:
        # Fallback: plain CSV
        import csv
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename.replace(".xlsx", ".csv")}"'
        response.write(u'\ufeff'.encode('utf8'))
        writer = csv.writer(response)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
        return response

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_name

    header_fill    = PatternFill("solid", fgColor=HEADER_FILL)
    alt_fill       = PatternFill("solid", fgColor=ALT_ROW_FILL)
    header_font    = Font(bold=True, color=HEADER_FONT_COLOR, size=11)
    title_font     = Font(bold=True, size=14)
    subtitle_font  = Font(italic=True, size=10, color="555555")
    center         = Alignment(horizontal="center", vertical="center")
    thin           = Side(style="thin", color="CCCCCC")
    border         = Border(left=thin, right=thin, top=thin, bottom=thin)

    # ── Row 1: Title ───────────────────────────────────────────────────────────
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
    title_cell = ws.cell(row=1, column=1, value=f"📊 {title}")
    title_cell.font = title_font
    title_cell.alignment = center

    # ── Row 2: Period label ────────────────────────────────────────────────────
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(headers))
    sub_cell = ws.cell(row=2, column=1, value=f"Período: {period_label}  |  Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    sub_cell.font = subtitle_font
    sub_cell.alignment = center

    # ── Row 3: blank separator ─────────────────────────────────────────────────
    ws.row_dimensions[3].height = 6

    # ── Row 4: Column headers ──────────────────────────────────────────────────
    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=4, column=col_idx, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center
        cell.border = border

    # ── Data rows (starting at row 5) ─────────────────────────────────────────
    for row_idx, row_data in enumerate(rows, start=5):
        fill = alt_fill if row_idx % 2 == 0 else PatternFill()
        for col_idx, value in enumerate(row_data, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.fill = fill
            cell.border = border
            cell.alignment = Alignment(vertical="center")

    # ── Auto-size columns ──────────────────────────────────────────────────────
    for col_idx, header in enumerate(headers, start=1):
        col_letter = get_column_letter(col_idx)
        max_len = max(
            len(str(header)),
            *(len(str(row[col_idx - 1])) for row in rows if row) if rows else [0]
        )
        ws.column_dimensions[col_letter].width = min(max_len + 4, 40)

    ws.freeze_panes = "A5"  # Freeze title + headers

    # ── Build response ─────────────────────────────────────────────────────────
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    response = HttpResponse(
        content=buffer.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

def create_multi_sheet_excel_response(filename: str, sheets_data: list) -> HttpResponse:
    """
    Creates an HttpResponse containing a styled .xlsx workbook with multiple sheets.

    - filename: e.g. 'historial_compras.xlsx'
    - sheets_data: list of dictionaries, each containing:
        - sheet_name: str
        - headers: list of column header strings
        - rows: list of tuples / lists with row data
        - title: big title shown in row 1
        - period_label: human-readable period string shown in row 2
    """
    if not OPENPYXL_AVAILABLE:
        # Fallback: plain CSV, we just export the first sheet's data as a CSV
        import csv
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename.replace(".xlsx", ".csv")}"'
        response.write(u'\ufeff'.encode('utf8'))
        writer = csv.writer(response)
        if sheets_data:
            first_sheet = sheets_data[0]
            writer.writerow(first_sheet['headers'])
            for row in first_sheet['rows']:
                writer.writerow(row)
        return response

    wb = openpyxl.Workbook()
    
    header_fill    = PatternFill("solid", fgColor=HEADER_FILL)
    alt_fill       = PatternFill("solid", fgColor=ALT_ROW_FILL)
    header_font    = Font(bold=True, color=HEADER_FONT_COLOR, size=11)
    title_font     = Font(bold=True, size=14)
    subtitle_font  = Font(italic=True, size=10, color="555555")
    center         = Alignment(horizontal="center", vertical="center")
    thin           = Side(style="thin", color="CCCCCC")
    border         = Border(left=thin, right=thin, top=thin, bottom=thin)

    for idx, sheet_info in enumerate(sheets_data):
        if idx == 0:
            ws = wb.active
            ws.title = sheet_info['sheet_name']
        else:
            ws = wb.create_sheet(title=sheet_info['sheet_name'])

        headers = sheet_info['headers']
        rows = sheet_info['rows']
        title = sheet_info['title']
        period_label = sheet_info['period_label']

        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers) or 1)
        title_cell = ws.cell(row=1, column=1, value=f"📊 {title}")
        title_cell.font = title_font
        title_cell.alignment = center

        ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(headers) or 1)
        sub_cell = ws.cell(row=2, column=1, value=f"Período: {period_label}  |  Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        sub_cell.font = subtitle_font
        sub_cell.alignment = center

        ws.row_dimensions[3].height = 6

        for col_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=4, column=col_idx, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center
            cell.border = border

        for row_idx, row_data in enumerate(rows, start=5):
            fill = alt_fill if row_idx % 2 == 0 else PatternFill()
            for col_idx, value in enumerate(row_data, start=1):
                cell = ws.cell(row=row_idx, column=col_idx, value=value)
                cell.fill = fill
                cell.border = border
                cell.alignment = Alignment(vertical="center")

        for col_idx, header in enumerate(headers, start=1):
            col_letter = get_column_letter(col_idx)
            max_len = max(
                len(str(header)),
                *(len(str(row[col_idx - 1])) for row in rows if row) if rows else [0]
            )
            ws.column_dimensions[col_letter].width = min(max_len + 4, 40)

        ws.freeze_panes = "A5"

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    response = HttpResponse(
        content=buffer.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
