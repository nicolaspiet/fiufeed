'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Maximize2, Minimize2, Radio, Trophy, Users, Bird } from 'lucide-react'

type HeroSectionProps = {
  isLoggedIn?: boolean
}

export function HeroSection({ isLoggedIn = false }: HeroSectionProps) {
  const [fullBleed, setFullBleed] = useState(true)

  const videoUrl =
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4'
  const primaryHref = isLoggedIn ? '/feed' : '/cadastro'
  const secondaryHref = isLoggedIn ? '/competicoes' : '/entrar'
  const primaryLabel = isLoggedIn ? 'Ir para o feed' : 'Criar conta grátis'
  const secondaryLabel = isLoggedIn ? 'Ver competições' : 'Entrar'

  return (
    <section
      className={`relative w-full overflow-hidden bg-[#03130d] text-white transition-all duration-500 ease-in-out ${fullBleed ? 'min-h-[100svh]' : 'py-8'
        }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f9f6b_0%,rgba(3,19,13,0.78)_38%,#03130d_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,22,15,0.12)_0%,rgba(4,22,15,0.62)_48%,rgba(3,19,13,0.96)_100%)]" />
      <div className="absolute left-1/2 top-[-12rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#4ade80]/18 blur-[140px]" />

      <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-30">
        <source src={videoUrl} type="video/mp4" />
      </video>

      <button
        onClick={() => setFullBleed((value) => !value)}
        aria-label={fullBleed ? 'Ajustar hero ao conteúdo' : 'Expandir hero para tela cheia'}
        className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-2.5 text-white/90 backdrop-blur-xl transition hover:bg-white/16 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#46d39a]"
      >
        {fullBleed ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      <div className="relative z-10 flex min-h-[100svh] flex-col px-4 pb-6 pt-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[1.25rem] bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl">
              <Bird size={18} className="text-[#9af2ca]" />
            </span>
            <span className="text-base font-semibold tracking-[-0.03em] text-white sm:text-lg">Fiufeed</span>
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href={isLoggedIn ? '/feed' : '/entrar'}
              className="rounded-full px-4 py-2 text-sm font-medium text-white/88 transition hover:bg-white/10"
            >
              {isLoggedIn ? 'Feed' : 'Entrar'}
            </Link>
            <Link
              href={primaryHref}
              className="rounded-full bg-[#4ade80] px-4 py-2 text-sm font-semibold text-[#062416] shadow-[0_12px_36px_rgba(74,222,128,0.22)] transition hover:brightness-110"
            >
              {isLoggedIn ? 'Abrir app' : 'Criar conta'}
            </Link>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-6xl mt-5 flex-1 items-center justify-center">
          <div className="flex w-full max-w-3xl flex-col items-center justify-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-[#dcfff0] shadow-[0_10px_35px_rgba(0,0,0,0.16)] backdrop-blur-xl">
              <span className="rounded-full bg-[#4ade80] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#062416]">
                Fiufeed
              </span>
              <span>Posts de assobios, grupos e competições no mesmo lugar</span>
            </div>

            <h1 className="mt-7 max-w-[11ch] text-balance text-[2.9rem] font-semibold leading-[0.94] tracking-[-0.07em] text-white sm:text-[4.4rem] lg:max-w-[10ch] lg:text-[5.8rem]">
              O assobio da comunidade, em um feed só seu.
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-[1rem] leading-7 text-[#d5e7de] sm:text-lg">
              Grave assobios em segundos, publique do celular, entre em grupos e acompanhe o que está em alta sem
              perder tempo.
            </p>

            <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={primaryHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#4ade80] px-6 text-base font-semibold text-[#062416] shadow-[0_16px_50px_rgba(74,222,128,0.24)] transition hover:-translate-y-0.5 hover:brightness-105"
              >
                {primaryLabel}
              </Link>
              <Link
                href={secondaryHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-white/10 px-6 text-base font-medium text-white backdrop-blur-xl transition hover:bg-white/14"
              >
                {secondaryLabel}
              </Link>
            </div>

            <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col items-center gap-2 rounded-[1.75rem] bg-black/14 px-4 py-4 text-center backdrop-blur-xl">
                <Users size={18} className="text-[#9af2ca]" />
                <p className="text-sm font-semibold text-white">Grupos ativos</p>
                <p className="text-sm leading-6 text-[#c5dbd0]">Comunidades públicas e privadas para cada nicho.</p>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-[1.75rem] bg-black/14 px-4 py-4 text-center backdrop-blur-xl">
                <Radio size={18} className="text-[#9af2ca]" />
                <p className="text-sm font-semibold text-white">Postagem imediata</p>
                <p className="text-sm leading-6 text-[#c5dbd0]">Do toque ao feed em poucos segundos, no mobile.</p>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-[1.75rem] bg-black/14 px-4 py-4 text-center backdrop-blur-xl">
                <Trophy size={18} className="text-[#9af2ca]" />
                <p className="text-sm font-semibold text-white">Competições</p>
                <p className="text-sm leading-6 text-[#c5dbd0]">Temas, ranking e participação dentro do próprio app.</p>
              </div>
            </div>

            <div className="mt-8 w-full max-w-2xl rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-[1px] shadow-[0_28px_90px_rgba(0,0,0,0.3)]">
              <div className="rounded-[calc(2rem-1px)] bg-[linear-gradient(180deg,rgba(5,23,16,0.88),rgba(4,16,12,0.82))] px-5 py-5 backdrop-blur-2xl sm:px-6">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-[radial-gradient(circle_at_30%_30%,#86efac_0%,#15803d_100%)] shadow-[0_8px_30px_rgba(74,222,128,0.28)]" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">@nicolaspietro</p>
                      <p className="text-sm text-[#b9cec4]">Assobio novo publicado agora no feed principal.</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#123222] px-3 py-1 text-xs font-medium text-[#a7f3cf]">Ao vivo</span>
                </div>

                <div className="mt-5 rounded-[1.6rem] bg-white/5 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">Post de assobios</p>
                      <p className="text-xs text-[#a8bdb3]">0:18 de duração · publicado agora</p>
                    </div>
                    <span className="text-xs font-medium text-[#9af2ca]">Feed principal</span>
                  </div>

                  <div className="mt-4 h-24 rounded-[1.4rem] bg-[linear-gradient(135deg,rgba(74,222,128,0.24),rgba(8,24,18,0.28))] px-3 py-4">
                    <div className="flex h-full items-end gap-1.5">
                      {[34, 56, 26, 70, 48, 84, 32, 60, 30, 68, 40, 58].map((height, index) => (
                        <span
                          key={index}
                          className="block flex-1 rounded-full bg-[#bbf7d0]"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-5 text-sm text-[#c8ddd3] sm:justify-between">
                    <span>186 curtidas</span>
                    <span>42 comentários</span>
                    <span>9 reposts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-5 flex w-full max-w-md gap-3 sm:hidden">
          <Link
            href={secondaryHref}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-white/10 px-4 text-sm font-medium text-white backdrop-blur-xl"
          >
            {secondaryLabel}
          </Link>
          <Link
            href={primaryHref}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#4ade80] px-4 text-sm font-semibold text-[#062416]"
          >
            {isLoggedIn ? 'Abrir app' : 'Criar conta'}
          </Link>
        </div>
      </div>
    </section>
  )
}
