
import Navbar from "@/components/layout/Navbar";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
    return (
        <header className="bg-white/80 top-0 w-full backdrop-blur-sm shadow-sm z-50">
            <Navbar />
            <LanguageSwitcher />
        </header>
    )
}