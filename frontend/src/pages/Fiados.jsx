import { useState, Suspense } from "react";
import { Tabs } from "antd";
import { CreditCardOutlined, TeamOutlined } from "@ant-design/icons";
import FiadosOperaciones from "../components/fiados/FiadosOperaciones";
import FiadosClientes from "../components/fiados/FiadosClientes";

const Loader = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
    <div className="spinner" />
  </div>
);

function Fiados() {
  const [headerActions, setHeaderActions] = useState(null);
  const [activeTab, setActiveTab] = useState("operaciones");

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
          <FiadosOperaciones onHeaderActions={setHeaderActions} isActive={activeTab === "operaciones"} />
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
          <FiadosClientes onHeaderActions={setHeaderActions} isActive={activeTab === "clientes"} />
        </Suspense>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <h1 className="page-title" style={{ display: "inline", marginRight: 10 }}>Fiados</h1>
          <span className="page-subtitle">Operaciones de cuentas por cobrar</span>
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

export default Fiados;