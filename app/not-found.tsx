"use client";

import Link from "next/link";

function BackgroundShapes() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="glow404" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#cf1b22" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#cf1b22" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50%" cy="45%" rx="35%" ry="28%" fill="url(#glow404)" />
      <circle cx="88%" cy="10%" r="180" stroke="#cf1b22" strokeWidth="1" fill="none" opacity="0.08" />
      <circle cx="88%" cy="10%" r="120" stroke="#cf1b22" strokeWidth="1" fill="none" opacity="0.06" />
      <circle cx="8%" cy="90%" r="150" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.04" />
      <line x1="0" y1="0" x2="100%" y2="100%" stroke="#ffffff" strokeWidth="1" opacity="0.02" />
      <line x1="100%" y1="0" x2="0" y2="100%" stroke="#ffffff" strokeWidth="1" opacity="0.02" />
      <circle cx="50%" cy="50%" r="280" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.03" strokeDasharray="4 8" />
      <circle cx="50%" cy="50%" r="380" stroke="#cf1b22" strokeWidth="1" fill="none" opacity="0.04" strokeDasharray="2 12" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #0f1219 100%)" }}
    >
      <BackgroundShapes />

      {/* Logo */}
      <div className="absolute top-8 left-8 flex items-center gap-3 z-10">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg"
          style={{ background: "linear-gradient(135deg, #cf1b22, #a51519)" }}
        >
          PE
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">PARTEQUIPOS SAS</p>
          <p className="text-gray-400 text-xs leading-none mt-0.5">Posventa Inteligente</p>
        </div>
      </div>

      {/* Main content */}
      <div
        className="relative z-10 flex flex-col items-center text-center px-6 animate-fade-in-up"
        style={{ animationDuration: "0.6s" }}
      >
        {/* 404 number */}
        <div
          className="font-black tracking-tighter select-none mb-4"
          style={{
            fontSize: "clamp(8rem, 20vw, 16rem)",
            lineHeight: 1,
            color: "#cf1b22",
            textShadow:
              "0 0 80px rgba(207,27,34,0.6), 0 0 160px rgba(207,27,34,0.3)",
            animation: "404float 4s ease-in-out infinite",
          }}
        >
          404
        </div>

        <style jsx>{`
          @keyframes 404float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-16px); }
          }
        `}</style>

        {/* Text */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Página No Encontrada
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-md mb-10 leading-relaxed">
          La página que buscas no existe o no tienes permiso para acceder a ella.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/dashboard"
            className="px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 shadow-lg"
            style={{
              background: "linear-gradient(135deg, #cf1b22, #a51519)",
              boxShadow: "0 4px 24px rgba(207,27,34,0.4)",
            }}
          >
            Volver al Panel
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl font-semibold text-white border border-white/20 transition-all duration-200 hover:bg-white/10 hover:-translate-y-0.5"
          >
            Ir a Iniciar Sesión
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center z-10">
        <p className="text-gray-600 text-xs font-mono tracking-widest">
          ERROR_CODE: PAGE_NOT_FOUND_404
        </p>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: "linear-gradient(90deg, transparent, #cf1b22, transparent)" }}
      />
    </div>
  );
}
