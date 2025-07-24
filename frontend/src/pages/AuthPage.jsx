import React, { useState, useContext, useEffect, use } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import AuthContext from "../context/AuthContext";
import { useGoogleLogin} from '@react-oauth/google';

export default function AuthPage() {
  const { login, register ,user, responseGoogle} = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const location = useLocation(); 

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname + location.state?.from?.search || "/home";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (activeTab === "login") {
        await login(loginData);
      } else {
        await register(signupData);
      }
       navigate(from, { replace: true });
    } catch (err) {
      console.error("Authentication error:", err);
      setError(err|| "Authentication failed");
    }
  };

  useEffect(()=>{
    if(user){
      navigate('/home');
    }
  },[])

  const handleGoogleSuccess = async (authResult) => {
    setError("");
    try {
      await responseGoogle(authResult); // Call the context function
      navigate(from, { replace: true });  // Navigate on success
    } catch (err) {
      setError(err?.response?.data?.message || "Google Sign-In failed.");
    }
  };

  const GoogleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleSuccess,
    flow: "auth-code",
  });

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
      style={{ backgroundImage: "url('/background.jpg')" }}
    >
      <div className="flex w-full max-w-4xl min-h-[520px] md:min-h-[480px] rounded-xl overflow-hidden shadow-2xl 
                      bg-white/80 sm:bg-white/90 backdrop-blur-lg">
        
        {/* Left: Form Section */}
        <div className="w-full md:w-3/5 p-8 md:p-10 flex flex-col justify-center">
          
          {/* Logo / Heading */}
          <div className="text-center mb-4">
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-wide drop-shadow-md">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-700">
                ChessWarriors
              </span>
            </h2>
            <p className="text-gray-700 font-medium text-sm mt-1">
              Outsmart. Outplay. Outmaneuver.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-6 space-x-8">
            <button
              className={`pb-1 font-semibold transition duration-300 ${
                activeTab === "login"
                  ? "text-black border-b-2 border-black"
                  : "text-gray-500 hover:text-black"
              }`}
              onClick={() => setActiveTab("login")}
            >
              Login
            </button>
            <button
              className={`pb-1 font-semibold transition duration-300 ${
                activeTab === "signup"
                  ? "text-black border-b-2 border-black"
                  : "text-gray-500 hover:text-black"
              }`}
              onClick={() => setActiveTab("signup")}
            >
              Sign Up
            </button>
          </div>

          {/* Error */}
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 min-h-[230px]">
            
              <input
                type="email"
                placeholder="Email"
                value={activeTab === "login" ? loginData.email : signupData.email}
                onChange={(e) =>
                activeTab === "login"
                  ? setLoginData({ ...loginData, email: e.target.value })
                  : setSignupData({ ...signupData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black transition"
                required
              />
            

            { activeTab=='signup' && <input
              type="text"
              placeholder="Username"
              value={signupData.username}
              onChange={(e) =>setSignupData({ ...signupData, username: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black transition"
              required
            />}

            <input
              type="password"
              placeholder="Password"
              value={activeTab === "login" ? loginData.password : signupData.password}
              onChange={(e) =>
                activeTab === "login"
                  ? setLoginData({ ...loginData, password: e.target.value })
                  : setSignupData({ ...signupData, password: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black transition"
              required
            />

            <button
              type="submit"
              className="w-full mt-2 font-bold font-serif  bg-white border-2 flex items-center justify-center h-12 rounded-full hover:bg-slate-100 transition duration-300 hover:cursor-pointer"
            >
              {activeTab === "login" ? "Login" : "Sign Up"}
            </button>
            <button onClick={GoogleLogin} type="button" className="w-full font-serif bg-white border-2 flex items-center justify-center h-12 rounded-full hover:bg-slate-100 transition duration-300 hover:cursor-pointer">
                <img src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/login/googleLogo.svg"  alt="googleLogo"/>
            </button>
          </form>
        </div>

        {/* Right: Image Section */}
        <div
          className="hidden md:block w-2/5 bg-cover bg-center"
          style={{
            backgroundImage: "url('/rightimage.jpg')",
          }}
        ></div>
      </div>
    </div>
  );
}
