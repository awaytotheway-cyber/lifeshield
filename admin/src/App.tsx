import { Authenticated, Refine } from "@refinedev/core";
import { ThemedLayout, useNotificationProvider } from "@refinedev/antd";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import {
  BankOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { App as AntdApp, ConfigProvider } from "antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";

import authProvider from "./authProvider";
import { AdminTitle } from "./components/AdminTitle";
import { ConfigWarning } from "./components/ConfigWarning";
import { lifeShieldAntdTheme } from "./theme/antdTheme";
import {
  ClinicalThresholdCreate,
  ClinicalThresholdEdit,
  ClinicalThresholdList,
  ClinicalThresholdShow,
} from "./pages/clinical-thresholds";
import {
  ClinicCreate,
  ClinicEdit,
  ClinicList,
  ClinicShow,
} from "./pages/clinics";
import {
  DoctorCreate,
  DoctorEdit,
  DoctorList,
  DoctorShow,
} from "./pages/doctors";
import { OrderItemList, OrderItemShow } from "./pages/order-items";
import {
  LabOrderEdit,
  LabOrderList,
  LabOrderShow,
} from "./pages/lab-orders";
import { OrderEdit, OrderList, OrderShow } from "./pages/orders";
import {
  ProductCreate,
  ProductEdit,
  ProductList,
  ProductShow,
} from "./pages/products";
import { ProfileList } from "./pages/profiles";
import { ReviewQueueList } from "./pages/review-queue";
import { ReviewQueuePatient } from "./pages/review-queue/patient";
import { AdminLoginPage } from "./pages/login";
import { UnauthorizedPage } from "./pages/unauthorized";
import { supabaseClient } from "./utility/supabaseClient";

import "@refinedev/antd/dist/reset.css";

function AdminShell() {
  return (
    <ThemedLayout Title={AdminTitle}>
      <ConfigWarning />
      <Outlet />
    </ThemedLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={lifeShieldAntdTheme}>
        <AntdApp>
          <Refine
            dataProvider={dataProvider(supabaseClient)}
            liveProvider={liveProvider(supabaseClient)}
            authProvider={authProvider}
            routerProvider={routerProvider}
            notificationProvider={useNotificationProvider}
            resources={[
              {
                name: "clinical_thresholds",
                list: "/clinical-thresholds",
                create: "/clinical-thresholds/create",
                edit: "/clinical-thresholds/edit/:id",
                show: "/clinical-thresholds/show/:id",
                meta: {
                  label: "Clinical thresholds",
                  icon: <SettingOutlined />,
                  id: "key",
                },
              },
              {
                name: "clinics",
                list: "/clinics",
                create: "/clinics/create",
                edit: "/clinics/edit/:id",
                show: "/clinics/show/:id",
                meta: { label: "Clinics", icon: <BankOutlined /> },
              },
              {
                name: "doctors",
                list: "/doctors",
                create: "/doctors/create",
                edit: "/doctors/edit/:id",
                show: "/doctors/show/:id",
                meta: { label: "Doctors", icon: <MedicineBoxOutlined /> },
              },
              {
                name: "products",
                list: "/products",
                create: "/products/create",
                edit: "/products/edit/:id",
                show: "/products/show/:id",
                meta: { label: "Products", icon: <ShopOutlined /> },
              },
              {
                name: "orders",
                list: "/orders",
                edit: "/orders/edit/:id",
                show: "/orders/show/:id",
                meta: { label: "Orders", icon: <ShoppingCartOutlined /> },
              },
              {
                name: "order_items",
                list: "/order-items",
                show: "/order-items/show/:id",
                meta: {
                  label: "Order items",
                  icon: <UnorderedListOutlined />,
                },
              },
              {
                name: "lab_orders",
                list: "/lab-orders",
                edit: "/lab-orders/edit/:id",
                show: "/lab-orders/show/:id",
                meta: {
                  label: "Lab orders",
                  icon: <ExperimentOutlined />,
                },
              },
              {
                name: "profiles",
                list: "/profiles",
                meta: { label: "Patients", icon: <TeamOutlined /> },
              },
              {
                name: "review_queue",
                list: "/review-queue",
                meta: {
                  label: "Review queue",
                  icon: <AuditOutlined />,
                },
              },
              {
                name: "lab_orders",
                list: "/lab-orders",
                edit: "/lab-orders/edit/:id",
                show: "/lab-orders/show/:id",
                meta: {
                  label: "Lab orders",
                  icon: <ExperimentOutlined />,
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              projectId: "lifeshield-admin",
              title: {
                text: "PRESCOPE Admin",
              },
            }}
          >
            <Routes>
              <Route
                element={
                  <Authenticated
                    key="authenticated-inner"
                    fallback={<CatchAllNavigate to="/login" />}
                  >
                    <AdminShell />
                  </Authenticated>
                }
              >
                <Route
                  index
                  element={<NavigateToResource resource="clinics" />}
                />
                <Route path="/clinical-thresholds">
                  <Route index element={<ClinicalThresholdList />} />
                  <Route path="create" element={<ClinicalThresholdCreate />} />
                  <Route path="edit/:id" element={<ClinicalThresholdEdit />} />
                  <Route path="show/:id" element={<ClinicalThresholdShow />} />
                </Route>
                <Route path="/clinics">
                  <Route index element={<ClinicList />} />
                  <Route path="create" element={<ClinicCreate />} />
                  <Route path="edit/:id" element={<ClinicEdit />} />
                  <Route path="show/:id" element={<ClinicShow />} />
                </Route>
                <Route path="/doctors">
                  <Route index element={<DoctorList />} />
                  <Route path="create" element={<DoctorCreate />} />
                  <Route path="edit/:id" element={<DoctorEdit />} />
                  <Route path="show/:id" element={<DoctorShow />} />
                </Route>
                <Route path="/products">
                  <Route index element={<ProductList />} />
                  <Route path="create" element={<ProductCreate />} />
                  <Route path="edit/:id" element={<ProductEdit />} />
                  <Route path="show/:id" element={<ProductShow />} />
                </Route>
                <Route path="/orders">
                  <Route index element={<OrderList />} />
                  <Route path="edit/:id" element={<OrderEdit />} />
                  <Route path="show/:id" element={<OrderShow />} />
                </Route>
                <Route path="/order-items">
                  <Route index element={<OrderItemList />} />
                  <Route path="show/:id" element={<OrderItemShow />} />
                </Route>
                <Route path="/lab-orders">
                  <Route index element={<LabOrderList />} />
                  <Route path="edit/:id" element={<LabOrderEdit />} />
                  <Route path="show/:id" element={<LabOrderShow />} />
                </Route>
                <Route path="/profiles">
                  <Route index element={<ProfileList />} />
                </Route>
                <Route path="/review-queue">
                  <Route index element={<ReviewQueueList />} />
                  <Route
                    path="patient/:userId"
                    element={<ReviewQueuePatient />}
                  />
                </Route>
                <Route path="/lab-orders">
                  <Route index element={<LabOrderList />} />
                  <Route path="edit/:id" element={<LabOrderEdit />} />
                  <Route path="show/:id" element={<LabOrderShow />} />
                </Route>
              </Route>

              <Route
                element={
                  <Authenticated
                    key="authenticated-outer"
                    fallback={<Outlet />}
                  >
                    <CatchAllNavigate to="/" />
                  </Authenticated>
                }
              >
                <Route path="/login" element={<AdminLoginPage />} />
              </Route>

              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="*" element={<CatchAllNavigate to="/" />} />
            </Routes>

            <UnsavedChangesNotifier />
            <DocumentTitleHandler handler={(title) => `${title} | PRESCOPE Admin`} />
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}
