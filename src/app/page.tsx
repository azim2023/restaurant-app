import Image from "next/image";
import Hero from "@/components/sections/Hero";
import MenuPreview from "@/components/sections/MenuPreview";
import BookingCTA from "@/components/sections/BookingCTA";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export default function Home() {
  return (
    <div className="text-gray-800">
      <main>
        <Header />
        <Hero />
        <MenuPreview />
        <BookingCTA />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
