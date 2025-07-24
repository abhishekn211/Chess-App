// src/App.jsx

import { createBrowserRouter ,RouterProvider, 
    Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Game from "./pages/Game";
import vsAi from "./pages/vsAi";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage"; // Naya import

const router = createBrowserRouter([
    {
        path: "/",
        element: <LandingPage />,
    },
    {
        path: "/auth",
        element: <AuthPage />,
    },
    {
        path: "/home",
        element: <ProtectedRoute><Home /></ProtectedRoute>,
    },
    {
        path: "/game",
        element: <ProtectedRoute><Game/></ProtectedRoute>,
    },
    {
        path: "/profile",
        element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
    },
    {
        path: "/user/:username",
        element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
    },
    {
        path: "/ai",
        element: <ProtectedRoute><vsAi /></ProtectedRoute>,
    },
]);

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      
        <RouterProvider router={router} />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;