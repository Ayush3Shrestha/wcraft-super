import { Link, NavLink, useNavigate } from "react-router-dom"
import { User, Menu, LogOut } from "lucide-react"
import { Button } from "../ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "../ui/navigation-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { clearAdminSession, getAdminUser } from "../../services/adminAuth"

// Logo Component
function Logo() {
  return (
    <div className="flex items-center space-x-2">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-orange-400 to-yellow-600 flex items-center justify-center">
        <span className="text-white font-bold text-sm">W</span>
      </div>
      <span className="font-bold text-lg font-body text-gray-900">WelcomeCraft</span>
    </div>
  )
}

// User Menu Component
function UserMenu() {
  const navigate = useNavigate()
  const admin = getAdminUser() || {}

  const handleLogout = () => {
    clearAdminSession()
    navigate("/admin/login", { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 w-9 rounded-full p-0 bg-gradient-to-r from-blue-400 to-purple-600 flex items-center justify-center"
        >
          <User className="h-4 w-4 text-white" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 shadow-lg rounded-xl">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold text-gray-800">{admin.username || "Admin"}</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/")}>
          View website
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="text-red-600 font-medium">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


// Navigation links used in both desktop and mobile menus
const navigationLinks = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/orders", label: "Orders" },
]

const linkClass = (base, active, inactive) => ({ isActive }) =>
  `${base} ${isActive ? active : inactive}`

export default function NavbarAdmin() {
  return (
    <header className="border-b px-4 md:px-6 bg-gradient-to-r from-white via-blue-100 to-white">
      <div className="flex h-16 items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex flex-1 items-center gap-2">
          {/* Mobile menu trigger */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="group size-8 md:hidden"
                variant="ghost"
                size="icon"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-1 md:hidden">
              <NavigationMenu className="max-w-none *:w-full">
                <NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
                  {navigationLinks.map((link, index) => (
                    <NavigationMenuItem key={index} className="w-full">
                      <NavLink
                          to={link.to}
                          className={linkClass(
                            "block py-2 px-3 rounded-md w-full text-left hover:bg-gray-100",
                            "bg-orange-50 text-orange-600 font-medium",
                            "text-gray-700"
                          )}
                        >
                          {link.label}
                        </NavLink>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </PopoverContent>
          </Popover>
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/admin/dashboard" className="text-primary hover:text-primary/90">
              <Logo />
            </Link>
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-1 items-center justify-end gap-2">
          {/* User menu */}
          <UserMenu />
        </div>
      </div>

      {/* Bottom navigation - Desktop only */}
      <div className="border-t py-2 max-md:hidden">
        <NavigationMenu>
          <NavigationMenuList className="gap-1">
            {navigationLinks.map((link, index) => (
              <NavigationMenuItem key={index}>
                <NavLink
                    to={link.to}
                    className={linkClass(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      "bg-orange-100 text-orange-700",
                      "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    {link.label}
                  </NavLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  )
}