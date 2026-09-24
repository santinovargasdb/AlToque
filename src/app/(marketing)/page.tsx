import type { Metadata } from "next";
import { Hero } from "./_components/hero";
import { OficiosMarquee } from "./_components/oficios-marquee";
import { ComoFunciona } from "./_components/como-funciona";
import { OficiosGrid } from "./_components/oficios-grid";
import { Verificacion } from "./_components/verificacion";
import { Urgencias } from "./_components/urgencias";
import { ProCta } from "./_components/pro-cta";

export const metadata: Metadata = {
  title: "AlToque — El oficio que necesitás, al toque",
  description:
    "Plomeros, cerrajeros, electricistas y gasistas verificados con DNI. Urgencias 24/7 y trabajos agendados en el Gran Buenos Aires.",
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                name: "AlToque",
                url: process.env.NEXT_PUBLIC_APP_URL ?? "https://altoque.ar",
                description:
                  "Plomeros, cerrajeros, electricistas y gasistas verificados con DNI.",
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://altoque.ar"}/categorias/{oficio}`,
                  },
                  "query-input": "required name=oficio",
                },
              },
              {
                "@type": "Organization",
                name: "AlToque",
                url: process.env.NEXT_PUBLIC_APP_URL ?? "https://altoque.ar",
                description:
                  "Plataforma que conecta clientes con profesionales de oficios verificados para trabajos a domicilio.",
              },
            ],
          }),
        }}
      />

      <Hero />
      <OficiosMarquee />
      <ComoFunciona />
      <OficiosGrid />
      <Verificacion />
      <Urgencias />
      <ProCta />
    </>
  );
}
