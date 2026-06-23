import { CloseOutlined } from '@ant-design/icons';
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { productosAPI, categoriasAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const ProductFormModal = ({ visible, mode = 'create', initialData = null, onClose, onSave }) => {
  const { isVendedor } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    categoria_nombre: '',
    stock_actual: 0,
    stock_minimo: 0,
    unidad_medida: 'UN',
    precio_compra: 0,
    precio_venta: 0,
    activo: true,
  });
  const [errors, setErrors] = useState({});
  const [categorias, setCategorias] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoCode, setAutoCode] = useState(true);
  const [userEditedCode, setUserEditedCode] = useState(false);
  const [generando, setGenerando] = useState(false);
  const autoCodeTimer = useRef(null);

  const triggerAutoCode = useCallback((nombre, categoria, codigos = []) => {
    clearTimeout(autoCodeTimer.current);
    setGenerando(true);
    autoCodeTimer.current = setTimeout(() => {
      const base = (nombre || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'PROD';
      const cat  = (categoria || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2) || 'XX';
      let num = 1;
      let code = `${cat}-${base}-${String(num).padStart(3, '0')}`;
      while (codigos.includes(code)) {
        num++;
        code = `${cat}-${base}-${String(num).padStart(3, '0')}`;
      }
      setFormData(prev => ({ ...prev, codigo: code }));
      setGenerando(false);
    }, 300);
  }, []);


  useEffect(() => {
    if (visible) {
      fetchCategorias();
      if (mode === 'edit' && initialData) {
        setFormData({
          codigo: initialData.codigo || '',
          nombre: initialData.nombre || '',
          descripcion: initialData.descripcion || '',
          categoria: initialData.categoria || '',
          categoria_nombre: initialData.categoria_nombre || '',
          stock_actual: initialData.stock_actual || 0,
          stock_minimo: initialData.stock_minimo || 0,
          unidad_medida: initialData.unidad_medida || 'UN',
          precio_compra: initialData.precio_compra || 0,
          precio_venta: initialData.precio_venta || 0,
          activo: initialData.activo !== undefined ? initialData.activo : true,
        });
      } else {
        setFormData({
          codigo: '',
          nombre: '',
          descripcion: '',
          categoria: '',
          categoria_nombre: '',
          stock_actual: 0,
          stock_minimo: 0,
          unidad_medida: 'UN',
          precio_compra: 0,
          precio_venta: 0,
          activo: true,
        });
        setUserEditedCode(false);
        // Auto-generate code when opening in create mode:
        productosAPI.getAll({ page_size: 500 }).then(r => {
          const ex = (r.data.results || r.data).map(p => p.codigo).filter(Boolean);
          triggerAutoCode('', '', ex);
        }).catch(() => triggerAutoCode('', '', []));
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [visible, mode, initialData]);

  const fetchCategorias = async () => {
    try {
      const response = await categoriasAPI.getAll();
      setCategorias(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData((prev) => {
      const updated = { ...prev, [name]: newValue };
      // Auto-generate code when nombre or categoria changes (only if user hasn't manually edited):
      if ((name === 'nombre' || name === 'categoria_nombre') && autoCode && !userEditedCode && mode === 'create') {
        const newNombre = name === 'nombre' ? value : prev.nombre;
        const newCat    = name === 'categoria_nombre' ? value : prev.categoria_nombre;
        productosAPI.getAll({ page_size: 500 }).then(r => {
          const ex = (r.data.results || r.data).map(p => p.codigo).filter(Boolean);
          triggerAutoCode(newNombre, newCat, ex);
        }).catch(() => triggerAutoCode(newNombre, newCat, []));
      }
      if (name === 'codigo') setUserEditedCode(true);
      return updated;
    });
  };

  const handleToggleAutoCode = () => {
    const next = !autoCode;
    setAutoCode(next);
    if (next && mode === 'create') {
      productosAPI.getAll({ page_size: 500 }).then(r => {
        const ex = (r.data.results || r.data).map(p => p.codigo).filter(Boolean);
        triggerAutoCode(formData.nombre, formData.categoria_nombre, ex);
      }).catch(() => triggerAutoCode(formData.nombre, formData.categoria_nombre, []));
    }
  };

  const handleRegenerate = () => {
    productosAPI.getAll({ page_size: 500 }).then(r => {
      const ex = (r.data.results || r.data).map(p => p.codigo).filter(Boolean);
      triggerAutoCode(formData.nombre, formData.categoria_nombre, ex);
    }).catch(() => triggerAutoCode(formData.nombre, formData.categoria_nombre, []));
  };

  const handleSubmit = async (e) => {

    e.preventDefault();
    // Inline validation
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.codigo.trim()) newErrors.codigo = 'El código es obligatorio';
    if (Number(formData.precio_venta) <= 0) newErrors.precio_venta = 'El precio de venta debe ser mayor a 0';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    try {
      let finalCategoriaId = formData.categoria || null;
      
      // Handle dynamic category creation
      const catText = (formData.categoria_nombre || '').trim();
      if (catText !== '') {
        const existingCat = categorias.find(c => c.nombre.toLowerCase() === catText.toLowerCase());
        if (existingCat) {
          finalCategoriaId = existingCat.id;
        } else {
          // It's a brand new category text, create it!
          try {
            const catRes = await categoriasAPI.create({ nombre: catText });
            finalCategoriaId = catRes.data.id;
          } catch (error) {
            console.error('Error creando nueva categoría:', error);
            alert('Hubo un error al intentar crear la nueva categoría. Verifica tu conexión.');
            setIsSubmitting(false);
            return;
          }
        }
      } else {
        // If text is empty, it means "Sin categoría", which maps to null
        finalCategoriaId = null;
      }

      const stockValue = Number(formData.stock_actual);
      const submitData = {
        ...formData,
        categoria: finalCategoriaId,
        precio_compra: Number(formData.precio_compra),
        precio_venta: Number(formData.precio_venta),
        // For new products, the model's save() copies stock_inicial -> stock_actual.
        // We must explicitly set both so the stock value is not overwritten with 0.
        stock_actual: stockValue,
        stock_inicial: stockValue,
        stock_minimo: Number(formData.stock_minimo)
      };

      let savedProduct;
      if (mode === 'create') {
        const res = await productosAPI.create(submitData);
        savedProduct = res.data;
      } else {
        const res = await productosAPI.update(initialData.id, submitData);
        savedProduct = res.data;
      }
      
      onSave(savedProduct);
      onClose();
    } catch (error) {
      console.error('Error saving producto:', error);
      alert(error.response?.data?.message || 'Error al guardar el producto');
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {mode === 'create' ? 'Nuevo Producto' : 'Editar Producto'}
          </h3>
          <button className="modal-close" onClick={onClose} disabled={isSubmitting}><CloseOutlined /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Código *
                  {mode === 'create' && !userEditedCode && (
                    <span style={{ fontSize: '10px', background: 'var(--color-primary)', color: '#fff',
                      padding: '1px 6px', borderRadius: '8px', fontWeight: 600 }}>AUTO</span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    name="codigo"
                    className={`form-input${errors.codigo ? ' input-error' : ''}`}
                    value={formData.codigo}
                    onChange={handleChange}
                    onFocus={(e) => e.target.select()}
                    disabled={isSubmitting}
                    placeholder={generando ? 'Generando...' : ''}
                    style={{ flex: 1 }}
                  />
                  {mode === 'create' && (
                    <button
                      type="button"
                      title="Regenerar código automáticamente"
                      onClick={() => { setUserEditedCode(false); handleRegenerate(); }}
                      disabled={generando || isSubmitting}
                      style={{ padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '16px',
                        opacity: generando ? 0.5 : 1, transition: 'opacity 0.2s' }}
                    >🔄</button>
                  )}
                </div>
                {errors.codigo && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.codigo}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  className={`form-input${errors.nombre ? ' input-error' : ''}`}
                  value={formData.nombre}
                  onChange={handleChange}
                  onFocus={(e) => e.target.select()}
                  disabled={isSubmitting}
                />
                {errors.nombre && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.nombre}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea
                name="descripcion"
                className="form-input"
                value={formData.descripcion}
                onChange={handleChange}
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">Unidad de Medida</label>
                <select
                  name="unidad_medida"
                  className="form-input"
                  value={formData.unidad_medida}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="UN">Unidad</option>
                  <option value="KG">Kilogramo</option>
                  <option value="LB">Libra</option>
                  <option value="MT">Metro</option>
                  <option value="LT">Litro</option>
                  <option value="GL">Galón</option>
                  <option value="CJ">Caja</option>
                  <option value="PK">Pack</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Stock *</label>
                <input
                  type="number"
                  name="stock_actual"
                  className="form-input"
                  value={formData.stock_actual}
                  onChange={handleChange}
                  onFocus={(e) => e.target.select()}
                  min="0"
                  step="0.01"
                  required
                  disabled={isSubmitting}
                />
              </div>
              {!isVendedor && (
                <div className="form-group">
                  <label className="form-label">Stock Mínimo</label>
                  <input
                    type="number"
                    name="stock_minimo"
                    className="form-input"
                    value={formData.stock_minimo}
                    onChange={handleChange}
                    onFocus={(e) => e.target.select()}
                    min="0"
                    step="0.01"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-3">
              {!isVendedor ? (
                <div className="form-group">
                  <label className="form-label">Precio de Compra (S/.) *</label>
                  <input
                    type="number"
                    name="precio_compra"
                    className="form-input"
                    value={formData.precio_compra}
                    onChange={handleChange}
                    onFocus={(e) => e.target.select()}
                    min="0"
                    step="0.01"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-muted)' }}>Precio de Compra</label>
                  <input
                    type="number"
                    className="form-input"
                    value="---"
                    disabled
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    title="Sin acceso: solo el Gerente puede ver el precio de compra"
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Precio de Venta (S/.) *</label>
                <input
                  type="number"
                  name="precio_venta"
                  className={`form-input${errors.precio_venta ? ' input-error' : ''}`}
                  value={formData.precio_venta}
                  onChange={handleChange}
                  onFocus={(e) => e.target.select()}
                  min="0"
                  step="0.01"
                  required
                  disabled={isSubmitting}
                />
                {errors.precio_venta && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.precio_venta}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <input
                  type="text"
                  name="categoria_nombre"
                  list="categorias-list"
                  className="form-input"
                  value={formData.categoria_nombre}
                  onChange={handleChange}
                  placeholder="Sin categoría"
                  autoComplete="off"
                  disabled={isSubmitting}
                />
                <datalist id="categorias-list">
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.nombre} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="activo-checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ userSelect: 'none', color: 'inherit' }}>Producto Activo</span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : (mode === 'create' ? 'Crear' : 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
