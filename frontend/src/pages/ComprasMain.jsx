import { useState, Suspense } from "react";
import { Tabs } from "antd";
import { ContainerOutlined, ToolOutlined } from "@ant-design/icons";
import { lazy } from "react";

const ComprasProductos = lazy(() => import("./Compras"));
const ComprasServicios = lazy(() => import("./ComprasServicios"));

const Loader = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
    <div className="spinner" />
  </div>
);

function ComprasMain() {
  const [activeTab, setActiveTab] = useState("productos");
  const [headerActions, setHeaderActions] = useState(null);

  const tabItems = [
    {
      key: "productos",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <ContainerOutlined />
          Compra de Productos
        </span>
      ),
      children: (
        <Suspense fallback={<Loader />}>
          <ComprasProductos
            onHeaderActions={setHeaderActions}
            isActive={activeTab === "productos"}
          />
        </Suspense>
      ),
    },
    {
      key: "servicios",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <ToolOutlined />
          Compra de Servicios
        </span>
      ),
      children: (
        <Suspense fallback={<Loader />}>
          <ComprasServicios
            onHeaderActions={setHeaderActions}
            isActive={activeTab === "servicios"}
          />
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
          <h1 className="page-title" style={{ display: "inline", marginRight: 10 }}>Compras</h1>
          <span className="page-subtitle">Registro de compras a proveedores</span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>{headerActions}</div>
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