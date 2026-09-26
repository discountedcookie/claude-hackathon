"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

export default function BuddyMascot({ className = "" }: { className?: string }) {
  const t = useT();
  const [greeting, setGreeting] = useState(false);

  useEffect(() => {
    const first = setTimeout(() => wave(), 1200);
    const every = setInterval(() => {
      if (!document.hidden) wave();
    }, 45000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, []);

  function wave() {
    setGreeting(false);
    requestAnimationFrame(() => {
      setGreeting(true);
      setTimeout(() => setGreeting(false), 1200);
    });
  }

  return (
    <button
      type="button"
      onClick={wave}
      aria-label={t("sayHi")}
      className={`buddy-mascot relative ${greeting ? "is-greeting" : ""} ${className}`}
    >
      <span
        aria-hidden
        className={`absolute -top-3 left-0 rounded-xl bg-cnx-lime px-2 py-0.5 text-xs font-semibold text-cnx-green transition-opacity ${
          greeting ? "opacity-100" : "opacity-0"
        }`}
        lang="th"
      >
        สวัสดี!
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 320 230"
        fill="none"
        aria-hidden
        focusable="false"
        className="absolute inset-0 h-full w-full"
      >
        <ellipse cx="166" cy="211" rx="113" ry="9" fill="#485747" opacity=".07" />
        <ellipse cx="167" cy="211" rx="78" ry="5" fill="#485747" opacity=".055" />
        <g className="buddy-wave">
          <path d="M82 127C67 123 54 112 46 95C40 94 35 91 34 86C26 85 22 78 27 74L34 74C28 66 28 60 32 58C37 56 41 64 46 70C41 58 43 51 48 52C53 53 55 64 58 74C57 65 60 61 64 63C70 66 67 81 65 87C72 98 80 102 91 105L82 127Z" fill="#EBE4CC" />
          <path d="M81 120C67 117 55 105 47 90C41 90 37 87 37 83C31 81 28 77 30 76L38 78C36 73 29 63 33 61C36 60 43 72 47 73C51 74 45 57 49 56C52 56 53 72 58 78C61 77 60 66 64 67C68 70 63 81 63 87C70 99 80 106 87 108L81 120Z" fill="#F8F2DF" />
          <path d="M46 79C52 81 55 85 55 91" stroke="#CFC5A9" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
        </g>
        <g className="buddy-main">
          <path d="M102 192C101 199 96 205 101 210C107 216 124 213 129 207L132 195L102 192Z" fill="#E5DDC3" />
          <path d="M155 194L158 207C164 215 181 215 186 208C189 203 182 197 179 190L155 194Z" fill="#E5DDC3" />
          <path d="M71 144C64 110 77 71 99 47C116 28 145 24 166 38C190 55 199 85 202 115C206 153 195 184 174 199C149 216 105 207 87 188C79 179 74 162 71 144Z" fill="#F3EDD8" />
          <path d="M83 94C91 65 111 40 133 36C157 32 174 49 185 70C173 52 154 44 137 48C112 53 95 74 83 94Z" fill="#FFFDF3" opacity=".82" />
          <path d="M76 148C88 177 108 190 137 193C164 196 186 181 199 155C195 175 187 191 174 199C149 216 105 207 87 188C79 179 76 162 76 148Z" fill="#E7DFC3" opacity=".65" />
          <path d="M89 102C86 113 85 124 87 134" stroke="#FFFCED" strokeWidth="6" strokeLinecap="round" opacity=".56" />
          <ellipse cx="108" cy="122" rx="9" ry="5" fill="#DD9C7D" opacity=".32" transform="rotate(-8 108 122)" />
          <ellipse cx="171" cy="117" rx="9" ry="5" fill="#DD9C7D" opacity=".32" transform="rotate(-8 171 117)" />
          <g className="buddy-eyes" fill="#3C463E">
            <rect x="117" y="103" width="4.4" height="10" rx="2.2" transform="rotate(-6 117 103)" />
            <rect x="157" y="100" width="4.4" height="10" rx="2.2" transform="rotate(-6 157 100)" />
          </g>
          <path d="M133 118C137 124 144 125 150 117" stroke="#3C463E" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M74 145C105 155 155 153 198 134L197 143C157 161 108 166 77 156L74 145Z" fill="#AD604E" />
          <path d="M75 147C108 158 156 154 198 136" stroke="#CF8E73" strokeWidth="1.4" />
          <path d="M77 154C111 164 157 159 197 141" stroke="#884B41" strokeWidth="1.2" opacity=".6" />
          <g stroke="#ECD6AE" strokeWidth="1.4" strokeLinecap="round" opacity=".8">
            <path d="M88 152L90 157M97 154L99 159M107 155L109 160M151 152L153 157M160 150L163 155M170 147L173 152M179 144L182 149" />
          </g>
          <path d="M126 157L122 177L134 181L137 157" fill="#AE614E" />
          <path d="M128 160L125 175M132 160L129 176" stroke="#D7A17F" strokeWidth="1.3" />
          <path d="M123 178L122 182M127 180L126 184M132 181L131 184" stroke="#995541" strokeWidth="1.4" strokeLinecap="round" />
        </g>
        <g className="buddy-peek">
          <path d="M213 196C208 202 205 208 209 212C214 217 229 215 233 209L235 199L213 196Z" fill="#80A99B" />
          <path d="M251 197L251 208C256 215 268 214 272 209C275 205 268 199 265 194L251 197Z" fill="#80A99B" />
          <path d="M271 163C280 163 284 157 286 149C287 145 291 145 292 149C296 162 286 179 272 180L271 163Z" fill="#8EB4A6" />
          <path d="M190 153C186 129 194 109 211 103C231 95 250 109 260 126C275 151 282 183 264 200C251 214 218 212 205 197C195 185 193 169 190 153Z" fill="#9FBFAE" />
          <path d="M194 137C195 119 203 108 215 107C230 105 243 116 250 128C236 114 222 112 213 117C204 122 199 130 194 137Z" fill="#CEE0C8" opacity=".72" />
          <path d="M201 175C214 196 242 203 267 187C273 183 276 178 278 174C279 185 274 194 264 201C248 214 219 211 205 197C201 191 198 183 197 176L201 175Z" fill="#82AC9B" opacity=".58" />
          <ellipse cx="206" cy="153" rx="7.3" ry="4.2" fill="#E6B098" opacity=".65" transform="rotate(12 206 153)" />
          <ellipse cx="253" cy="146" rx="7.3" ry="4.2" fill="#E6B098" opacity=".65" transform="rotate(12 253 146)" />
          <g className="buddy-eyes" fill="#354C41">
            <rect x="212" y="135" width="3.9" height="8.1" rx="1.95" transform="rotate(-11 212 135)" />
            <rect x="242" y="130" width="3.9" height="8.1" rx="1.95" transform="rotate(-11 242 130)" />
          </g>
          <path d="M225 148C229 152 234 151 237 146" stroke="#354C41" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M200 174C219 178 247 174 272 162" stroke="#E3E4C5" strokeWidth="5" />
          <path d="M209 176L210 179M215 176L216 179M221 176L222 179M254 170L256 173M260 167L262 170" stroke="#9A6652" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M204 168C196 163 190 157 185 149C182 144 178 143 176 146C172 145 168 148 170 152C165 153 168 159 171 162C179 172 190 180 202 181L204 168Z" fill="#90B4A0" />
          <path d="M201 169C190 163 187 157 182 150C180 147 177 149 176 151C172 148 170 151 173 155C169 155 172 160 174 162C182 171 191 175 201 177L201 169Z" fill="#ADCAB6" />
        </g>
        <g className="buddy-spark">
          <path d="M250 45C251 53 254 57 262 59C254 60 251 64 249 72C248 64 245 60 237 58C245 57 248 53 250 45Z" fill="#C1745C" />
          <circle cx="270" cy="81" r="3" fill="#D6AE74" opacity=".8" />
        </g>
      </svg>
    </button>
  );
}
