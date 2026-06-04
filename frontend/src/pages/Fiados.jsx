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
          <FiadosOperaciones />
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
          <FiadosClientes />
        </Suspense>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        tabBarStyle={{ marginBottom: 20 }}
        destroyInactiveTabPane={false}
        tabBarExtraContent={{
          left: (
            <div style={{ marginRight: 24, paddingBottom: 4 }}>
              <h1 className="page-title" style={{ margin: 0, display: "inline" }}>Fiados</h1>
              <span className="page-subtitle" style={{ marginLeft: 10 }}>Operaciones de cuentas por cobrar</span>
            </div>
          ),
        }}
      />
    </div>
  );
}

export default Fiados;