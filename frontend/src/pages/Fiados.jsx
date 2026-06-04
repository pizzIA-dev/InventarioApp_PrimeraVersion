import { useState, Suspense, useContext } from "react";
import { Tabs } from "antd";
import { CreditCardOutlined, TeamOutlined, PlusOutlined } from "@ant-design/icons";
import { lazy } from "react";
import { message } from "antd";
import { fiadosAPI } from "../services/api";
import ExportDropdown from "../components/ExportDropdown";
import { AuthContext } from "../context/AuthContext";

const FiadosOperacionesPage = lazy(() => import("../components/fiados/FiadosOperaciones"));
const FiadosClientesPage = lazy(() => import("../components/fiados/FiadosClientes"));

const Loader = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
    <div className="spinner" />
  </div>
);

function Fiados() {
  const { isVendedor } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("operaciones");
  const [openFiadoCount, setOpenFiadoCount] = useState(0);

  const handleExportHistorialGlobal = async (periodo, anio) => {
    try {
      const response = await fiadosAPI.exportarHistorialGlobal({ periodo, anio });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `historial_fiados_${periodo}_${anio || "todo"}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      message.error("No se pudo generar el reporte de historial.");
    }
  };

  const handleExportFiados = async (periodo, anio) => {
    try {
      const response = await fiadosAPI.exportar({ periodo, anio });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `reporte_fiados_${periodo}_${anio || "todo"}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      message.error("No se pudo generar el reporte de fiados.");
    }
  };

  const renderHeaderButtons = () => {
    if (activeTab === "operaciones") {
      return (
        <>
          {!isVendedor && (
            <>
              <ExportDropdown onExport={handleExportHistorialGlobal} label="Exportar Historial Global" />
              <ExportDropdown onExport={handleExportFiados} label="Exportar Fiados" />
            </>
          )}
          <button className="btn btn-primary" onClick={() => setOpenFiadoCount(c => c + 1)}>
            <PlusOutlined /> Nuevo Fiado
          </button>
        </>
      );
    }
    return null;
  };

  const tabItems = [
    {
      key: "operaciones",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <CreditCardOutlined />
          Operaciones / Deudas
        </span>
      ),
      children: (
        <Suspense fallback={<Loader />}>
          <FiadosOperacionesPage openNew={openFiadoCount} />
        </Suspense>
      ),
    },
    {
      key: "clientes",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <TeamOutlined />
          Clientes Fiados
        </span>
      ),
      children: (
        <Suspense fallback={<Loader />}>
          <FiadosClientesPage />
        </Suspense>
      ),
    },
  ];

  return (
    <div>
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}
      >
        <div>
          <h1 className="page-title" style={{ display: "inline", marginRight: 10 }}>Fiados</h1>
          <span className="page-subtitle">Operaciones de cuentas por cobrar</span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>{renderHeaderButtons()}</div>
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

export default Fiados;