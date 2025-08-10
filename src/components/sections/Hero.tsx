import Image from "next/image"

type HeroProps = {
    title: string;
    subtitle: string;
}
export default function Hero({title, subtitle}: HeroProps) {
    return (
        <section className="relative h-[100vh] flex-col bg-center bg-white">
            <h1>{title} </h1>
            <p>{subtitle}</p>
        </section>
    )
}