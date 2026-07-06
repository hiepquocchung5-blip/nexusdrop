import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Storefront from "./pages/Storefront";
import GameDetail from "./pages/GameDetail";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import WalletPage from "./pages/Wallet";
import AdminReview from "./pages/AdminReview";
import Login from "./pages/Login";

export default function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<Layout />}>
          <Route index element={<Storefront />} />
          <Route path="game/:slug" element={<GameDetail />} />
          <Route path="login" element={<Login />} />
          <Route
            path="orders"
            element={
              <RequireAuth>
                <Orders />
              </RequireAuth>
            }
          />
          <Route
            path="orders/:id"
            element={
              <RequireAuth>
                <OrderDetail />
              </RequireAuth>
            }
          />
          <Route
            path="wallet"
            element={
              <RequireAuth>
                <WalletPage />
              </RequireAuth>
            }
          />
          <Route
            path="admin"
            element={
              <RequireAuth>
                <AdminReview />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
