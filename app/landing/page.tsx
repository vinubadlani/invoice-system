"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle,
  CreditCard,
  FileText,
  Lock,
  Menu,
  Package,
  Receipt,
  Shield,
  TrendingUp,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const features = [
  {
    icon: FileText,
    title: "Invoice Management",
    description: "Create, send, and track GST-compliant invoices. Automated reminders keep your cash flow on track.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Live dashboards show revenue, outstanding balances, and business trends at a glance.",
  },
  {
    icon: Users,
    title: "Party Management",
    description: "Manage customers and suppliers with full transaction history and ledger reports.",
  },
  {
    icon: Package,
    title: "Inventory Control",
    description: "Track stock levels, manage item catalogue, and receive low-stock alerts automatically.",
  },
  {
    icon: CreditCard,
    title: "Bank and Payments",
    description: "Record bank transactions, reconcile accounts, and monitor payment status in one place.",
  },
  {
    icon: Receipt,
    title: "Purchase Management",
    description: "Handle vendor bills, purchase orders, and cost tracking with full audit trail.",
  },
]

const stats = [
  { value: "80%", label: "Faster invoice processing" },
  { value: "3x", label: "Quicker payment collection" },
  { value: "10 hrs", label: "Saved per week on average" },
  { value: "99.9%", label: "Platform uptime" },
]

const testimonials = [
  {
    name: "Rajesh Kumar",
    business: "Kumar Electronics",
    quote:
      "This system transformed our billing process. We save hours every week and our cash flow improved dramatically.",
  },
  {
    name: "Priya Sharma",
    business: "Sharma Textiles",
    quote:
      "Professional invoices and real-time insights are game-changers. The best investment we made for our business.",
  },
  {
    name: "Amit Patel",
    business: "Patel Trading Co.",
    quote:
      "Simple yet powerful. Our accountant loves how organized everything is now. Highly recommended.",
  },
]

const pricingPlans = [
  {
    name: "Starter",
    price: "Free",
    description: "For individuals and micro-businesses",
    features: ["Up to 10 invoices / month", "Basic dashboard", "1 user", "Email support"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "999",
    description: "For growing businesses",
    features: [
      "Unlimited invoices",
      "Advanced analytics",
      "Inventory management",
      "Up to 5 users",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "2,999",
    description: "For larger organizations",
    features: [
      "Everything in Professional",
      "Multi-location support",
      "API access",
      "Unlimited users",
      "24/7 phone support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            HisabKitab
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                Log in
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Get started
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3">
            <a href="#features" className="block text-sm text-gray-700 hover:text-gray-900" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="block text-sm text-gray-700 hover:text-gray-900" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#pricing" className="block text-sm text-gray-700 hover:text-gray-900" onClick={() => setMenuOpen(false)}>Pricing</a>
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <Link href="/auth/login" onClick={() => setMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">Log in</Button>
              </Link>
              <Link href="/auth/signup" onClick={() => setMenuOpen(false)}>
                <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">Get started</Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 text-blue-700 border-blue-200 bg-blue-50 text-xs font-medium px-3 py-1 rounded-full">
            Built for Indian businesses
          </Badge>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-gray-900 leading-none mb-6">
            Business accounting,<br />
            <span className="text-blue-600">done right.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            GST invoices, inventory, expenses, and financial reports — all in one place.
            Built for traders, manufacturers, and service businesses across India.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-11 text-sm font-medium">
                Start for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="px-8 h-11 text-sm font-medium border-gray-300">
                Log in to your account
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">No credit card required. Free plan available.</p>
        </div>

        <div className="mt-16 max-w-2xl mx-auto flex flex-wrap justify-center items-center gap-x-10 gap-y-4 text-sm text-gray-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-gray-400" />
            Bank-level security
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-gray-400" />
            End-to-end encryption
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            10,000+ businesses
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-gray-100 bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Everything your business needs
            </h2>
            <p className="text-gray-500 text-base leading-relaxed">
              A complete suite of tools to manage invoices, track finances, and grow with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all duration-200 bg-white"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <feature.icon className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Up and running in minutes
            </h2>
            <p className="text-gray-500 text-base">
              No long onboarding. Set up your business and start invoicing right away.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: "01", title: "Create your account", body: "Sign up with your email, add your business details, logo, and GSTIN — takes under two minutes." },
              { step: "02", title: "Add parties and items", body: "Import or manually add your customers, suppliers, and product/service catalogue." },
              { step: "03", title: "Start invoicing", body: "Generate GST invoices in seconds, share via WhatsApp or email, and track payment status live." },
            ].map((item) => (
              <div key={item.step} className="relative pl-12">
                <span className="absolute left-0 top-0 text-4xl font-black text-gray-100 select-none leading-none">
                  {item.step}
                </span>
                <h3 className="font-semibold text-gray-900 mb-2 mt-1">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Trusted by business owners
            </h2>
            <p className="text-gray-500 text-base">
              Hear from people who use HisabKitab every day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-6 rounded-xl border border-gray-200 bg-white flex flex-col gap-4"
              >
                <p className="text-gray-600 text-sm leading-relaxed">"{t.quote}"</p>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                  <div className="text-xs text-gray-400">{t.business}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-500 text-base">
              Start free and upgrade as your business grows. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={"relative rounded-xl border p-8 flex flex-col bg-white " + (plan.highlighted ? "border-blue-600 shadow-md" : "border-gray-200")}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                    Most popular
                  </span>
                )}
                <div className="mb-6">
                  <div className="font-semibold text-gray-900 mb-1">{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    {plan.price === "Free" ? (
                      <span className="text-3xl font-bold text-gray-900">Free</span>
                    ) : (
                      <>
                        <span className="text-sm text-gray-500">Rs.</span>
                        <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-sm text-gray-400">/mo</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href={plan.name === "Enterprise" ? "#" : "/auth/signup"}>
                  <Button
                    className={"w-full " + (plan.highlighted ? "bg-blue-600 hover:bg-blue-700 text-white" : "")}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Ready to simplify your business?
          </h2>
          <p className="text-gray-500 mb-8 text-base">
            Join thousands of businesses already using HisabKitab to manage their finances.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-10 h-11 text-sm font-medium">
              Create a free account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-4 text-xs text-gray-400">No credit card required. Start in under 2 minutes.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-base mb-3">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              HisabKitab
            </Link>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              Complete business management — invoicing, inventory, reports — built for Indian businesses.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#features" className="hover:text-gray-700 transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-gray-700 transition-colors">Pricing</a></li>
              <li><Link href="/auth/signup" className="hover:text-gray-700 transition-colors">Sign up</Link></li>
              <li><Link href="/auth/login" className="hover:text-gray-700 transition-colors">Log in</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-gray-700 transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-gray-700 transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-gray-700 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-gray-700 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-400">
          <span>&#169; {new Date().getFullYear()} HisabKitab. All rights reserved.</span>
          <span>Made for Indian businesses</span>
        </div>
      </footer>
    </div>
  )
}
