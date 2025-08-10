import Image from "next/image";
import Hero from "@/components/sections/Hero";
import MenuPreview from "@/components/sections/MenuPreview";
import BookingCTA from "@/components/sections/BookingCTA";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
type Props = {
  params: Promise<{ locale: string}>;
};

export default async function Home({ params} : Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  return (
    <div className="text-gray-800">
      <main>
        <Header />
        <Hero title={t("heroTitle")} subtitle={t("heroSubtitle")} />
        <MenuPreview title={t("menuPreviewTitle")} subtitle={t("menuPreviewSubtitle")}/>
        <BookingCTA />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
