import { useState, useContext } from "react";
import { Tabs, message } from "antd";
import { ContainerOutlined, ToolOutlined, PlusOutlined } from "@ant-design/icons";
import { comprasAPI, comprasServiciosAPI } from "../services/api";
import ExportDropdown from "../components/ExportDropdown";
import { AuthContext } from "../context/AuthContext";
import Compras from "./Compras";
import ComprasServicios from "./ComprasServicios";

function ComprasMain() {
  const { isVendedor } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("productos");
  const [openProductosCount, setOpenProductosCount] = useState(0);
  const [openServiciosCount, setOpenServiciosCount] = useState(0);

  const handleExportHistorialGlobal = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await comprasAPI.exportarHistorialGlobal(params);
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `historial_compras_${periodo}${anio ? "_" + anio : ""}.xlsx`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { message.error("Error al exportar historial."); }
  };

  const handleExportCompras = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await comprasAPI.exportar(params);
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `compras_${periodo}${anio ? "_" + anio : ""}.xlsx`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { message.error("Error al exportar compras."); }
  };

  const handleExportComprasServicios = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await comprasServiciosAPI.exportar(params);
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `compras_servicios_${periodo}${anio ? "_" + anio : ""}.xlsx`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { message.error("Error al exportar compras de servicios."); }
  };

  const headerButtons = activeTab === "productos" ? (
    <>
      {!isVendedor && (
        <>
          <ExportDropdown onExport={handleExportHistorialGlobal} label="Exportar Historial Global" />
          <ExportDropdown onExport={handleExportCompras} label="Exportar Compras" />
        </>
      )}
      <button className="btn btn-primary" onClick={() => setOpenProductosCount(n => n + 1)}>
        <PlusOutlined /> Nueva Compra
      </button>
    </>
  ) : (
    <>
      {!isVendedor && (
        <ExportDropdown onExport={handleExportComprasServicios} label="Exportar Compras Servicios" />
      )}
      <button className="btn btn-primary" onClick={() => setOpenServiciosCount(n => n + 1)}>
        <PlusOutlined /> Nueva Compra Servicio
      </button>
    </>
  );

  const tabItems = [
    {
      key: "productos",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <ContainerOutlined /> Compra de Productos
        </span>
      ),
      children: <Compras openNew={openProductosCount} />,
    },
    {
      key: "servicios",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <ToolOutlined /> Compra de Servicios
        </span>
      ),
      children: <ComprasServicios openNew={openServiciosCount} />,
    },
  ];

  return (
    <div>
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}
      >
        <div>
          <h1 className="page-title" style={{ display: "inline", marginRight: 10 }}>Compras</h1>
          <span className="page-subtitle">Registro de compras a proveedores</span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>{headerButtons}</div>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        tabBarStyle={{ marginBottom: 20 }}
        destroyInactiveTabPane={false}
      />
    </div>
  );
}

export default ComprasMain;