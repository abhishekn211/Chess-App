import { Link } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "../context/AuthContext";

export default function LandingPage() {
  const { user } = useContext(AuthContext);
  console.log(user);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* ✅ Responsive Background Image */}
      <picture>
        <source media="(max-width: 640px)" srcSet="/landingpage.jpg" />
        <img
          src="/landing.jpeg"
          alt="Chess Background"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      </picture>

      {/* ✅ Content Overlay */}
      <div className="relative z-20 flex flex-col min-h-screen px-4 sm:px-6 py-6 sm:py-10 text-white">
        
        {/* ✅ Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-wide">
            ChessWarriors
          </h1>

          {/* 🔁 Auth-aware right section */}
          {user ? (
            <div className="text-sm sm:text-base text-white">
              Welcome <span className="font-semibold text-white capitalize">{user.name}</span>
            </div>
          ) : (
            <div className="flex gap-2 sm:gap-4">
              <Link
                to="/auth"
                className="bg-white text-black text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-gray-200 transition"
              >
                Login
              </Link>
              <Link
                to="/auth"
                className="text-sm sm:text-base border border-white px-3 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-white hover:text-black transition"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* ✅ Center Message */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl sm:text-4xl md:text-6xl font-extrabold mb-4 drop-shadow-lg leading-tight">
            Step Into the Arena of Intellect
          </h2>
          <p className="text-base sm:text-lg md:text-xl max-w-xl mb-6 sm:mb-8 drop-shadow">
            Outsmart your opponent. Train your mind. Conquer the board. A modern chess battleground for real warriors.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <Link
            to="/ai"
            className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-6 py-3 rounded-lg text-base sm:text-lg shadow-lg transition"
          >
            Play vs AI
          </Link>
          <Link
            to="/home"
            className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-6 py-3 rounded-lg text-base sm:text-lg shadow-lg transition"
          >
            Enter the Game
          </Link>
          </div>
        </div>

        {/* ✅ Footer */}
        <div className="text-center mt-6">
          <p className="text-xs sm:text-sm text-gray-300">
            &copy; 2025 ChessWarriors. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
