import { notFound } from "next/navigation";
import { ExampleDetail } from "@/components/examples/example-detail";
import { publicExamples } from "@/lib/public-examples";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const example = publicExamples.find(item => item.slug === slug);
  return { title: example ? `${example.title[0]} · Examples` : "Example not found" };
}
export default async function ExamplePage({ params }: Props) {
  const { slug } = await params;
  const example = publicExamples.find(item => item.slug === slug);
  if (!example) notFound();
  return <ExampleDetail key={example.slug} example={example} />;
}
