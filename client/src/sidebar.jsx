import React, { useState } from "react";
import logo from "./assets/logo.png";
import logo2 from "./assets/logo2.png";
import {
  Home,
  Users,
  Box,
  Package,
  Warehouse,
  ShoppingCart,
  FileText,
  FileSignature,
  DollarSign,
  RotateCcw,
  CreditCard,
  Truck,
  Receipt,
  ShoppingBag,
  ArrowLeftRight,
  PieChart,
  Calculator,
  Tools,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [openMenus, setOpenMenus] = useState({});

  // Toggle menu open/close
  const toggleMenu = (menu) => {
    setOpenMenus((prevState) => ({
      ...prevState,
      [menu]: !prevState[menu],
    }));
  };

  const sidebarItems = [
    { label: "Dashboard", icon: <Home />, href: "#" },
    { label: "Parties", icon: <Users />, href: "#" },
    {
      label: "Items",
      icon: <Box />,
      href: "#",
      subItems: [
        { label: "Inventory", icon: <Package />, href: "#" },
        { label: "Godown", icon: <Warehouse />, href: "#" },
      ],
    },
    {
      label: "Sales",
      icon: <ShoppingCart />,
      href: "#",
      subItems: [
        { label: "Sales Invoices", icon: <FileText />, href: "salesinvoice" },
        { label: "Quotation", icon: <FileSignature />, href: "#" },
        { label: "Payment In", icon: <DollarSign />, href: "#" },
        { label: "Sales Return", icon: <RotateCcw />, href: "#" },
        { label: "Credit Note", icon: <CreditCard />, href: "#" },
        { label: "Delivery Challan", icon: <Truck />, href: "#" },
        { label: "Proforma Invoice", icon: <Receipt />, href: "#" },
      ],
    },
    {
      label: "Purchases",
      icon: <ShoppingBag />,
      href: "#",
      subItems: [
        { label: "Purchase Invoices", icon: <FileText />, href: "#" },
        { label: "Payment Out", icon: <DollarSign />, href: "#" },
        { label: "Purchase Return", icon: <ArrowLeftRight />, href: "#" },
        { label: "Debit Note", icon: <FileText />, href: "#" },
        { label: "Purchase Orders", icon: <ShoppingCart />, href: "#" },
      ],
    },
    { label: "Reports", icon: <PieChart />, href: "#" },
    { label: "Accounting Solutions", icon: <Calculator />, href: "#" },
    { label: "Business Tools", icon: <Tools />, href: "#" }, // Fixed
    { label: "Manage Users", icon: <User />, href: "#" },
    { label: "Settings", icon: <Settings />, href: "#" },
  ];

  // Define theme colors
  const theme = {
    dark: { bg: "bg-black", text: "text-white", hover: "hover:bg-gray-800", border: "border-gray-700" },
    light: { bg: "bg-white", text: "text-gray-800", hover: "hover:bg-gray-100", border: "border-gray-200" },
  };

  const currentTheme = isDarkMode ? theme.dark : theme.light;

  return (
    <nav className={`${currentTheme.bg} ${currentTheme.text} transition-all duration-300 min-h-screen border-r ${currentTheme.border} ${isExpanded ? "w-64" : "w-24"} flex flex-col justify-between`}>
      {/* Top section */}
      <div>
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center justify-center w-full">
            <img src={isDarkMode ? logo : logo2} alt="Logo" className="h-20 w-20" />
            {isExpanded && <h2 className="text-xl font-bold ml-2">IIITN</h2>}
          </div>
          <button onClick={() => setIsExpanded(!isExpanded)} className={`${currentTheme.hover} p-2 rounded-lg ml-auto`}>
            {isExpanded ? <ChevronLeft /> : <ChevronRight />}
          </button>
        </div>

        <ul className="mt-8">
          {sidebarItems.map((item, index) => (
            <li key={index}>
              <div onClick={() => item.subItems && toggleMenu(item.label)} className={`${currentTheme.hover} cursor-pointer flex items-center p-4 transition-colors duration-200`}>
                {item.icon}
                {isExpanded && <span className="ml-4">{item.label}</span>}
              </div>
              {item.subItems && openMenus[item.label] && isExpanded && (
                <ul className="ml-8">
                  {item.subItems.map((subItem, subIndex) => (
                    <li key={subIndex}>
                      <a href={subItem.href} className={`${currentTheme.hover} cursor-pointer flex items-center p-2 transition-colors duration-200`}>
                        {subItem.icon}
                        {isExpanded && <span className="ml-2">{subItem.label}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Theme toggle button at bottom */}
      <div className="p-4 border-t border-gray-700">
        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`${currentTheme.hover} p-2 rounded-lg w-full flex items-center justify-center transition-colors duration-200`}>
          {isExpanded ? (
            <div className="flex items-center">
              {isDarkMode ? <Sun className="mr-2" /> : <Moon className="mr-2" />}
              <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
            </div>
          ) : isDarkMode ? (
            <Sun />
          ) : (
            <Moon />
          )}
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
