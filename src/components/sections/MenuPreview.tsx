
type MenuPreviewProps = {
    title: string,
    subtitle: string;
}
export default function MenuPreview({title, subtitle}: MenuPreviewProps) {
    return (
        <section className="relative h-[100vh] flex-col bg-center bg-green-500">
            <h1>{title}</h1>
            <p>{subtitle}</p>
        </section>
    )
}