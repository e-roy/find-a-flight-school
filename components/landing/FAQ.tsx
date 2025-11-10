"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "Is this free for students?",
    answer: "Yes—browsing, comparing, and matching are free.",
  },
  {
    question: "Where does the data come from?",
    answer:
      'Public sources, school-submitted info, and **privacy-safe FSP operational signals** for verified tiers. Each field shows an "as-of" timestamp.',
  },
  {
    question: "How accurate are cost estimates?",
    answer:
      "We show **Expected Total Cost bands** based on standardized assumptions and real-world signals; schools can supply specifics.",
  },
  {
    question: "What if my school isn't listed or is wrong?",
    answer:
      "Schools can claim and update profiles; verification improves visibility.",
  },
  {
    question: "Do badges affect ranking?",
    answer:
      "Trust tiers and relevance signals inform presentation to help students decide with confidence.",
  },
  {
    question: "Can I book a discovery flight?",
    answer:
      "Many profiles offer inquiry/tour or discovery-flight booking flows; availability varies.",
  },
];

export function FAQ() {
  return (
    <section
      id="faq"
      className="container mx-auto px-4 py-16 md:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <h2 className="text-3xl font-bold tracking-tight text-center sm:text-4xl">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border rounded-xl px-4 mb-2 shadow-sm"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">
                  {item.answer.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                      return <strong key={i}>{part.slice(2, -2)}</strong>;
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
