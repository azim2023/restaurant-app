import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import React from "react";
import { setRequestLocale } from "next-intl/server";
export function generateStaticParams() {
    return routing.locales.map((locale => ({locale})));
}

export default async function LocaleLayout({children, params}: {children: React.ReactNode; params: Promise<{locale: string}>}) {
    const {locale} = await params;

    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }
    setRequestLocale(locale)
    let messages;
    try {
        messages = await getMessages();
    } catch (error){
        notFound();
    }
    
    return (
        <NextIntlClientProvider locale={locale} messages={messages} key={locale}>
            {children}
        </NextIntlClientProvider>
    );
}