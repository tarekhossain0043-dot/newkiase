"use client";

import { ToastContainer } from "react-toastify";

export default function ToastProvider() {
  return <ToastContainer
    position="top-right"
    autoClose={3200}
    newestOnTop
    closeOnClick
    pauseOnFocusLoss
    draggable
    pauseOnHover
    theme="colored"
  />;
}
