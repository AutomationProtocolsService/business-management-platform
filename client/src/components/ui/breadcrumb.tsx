import * as React from "react"
import { ChevronRight } from "lucide-react"
import { Link } from "wouter"
import { cn } from "@/lib/utils"

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  separator?: React.ReactNode
}

export interface BreadcrumbListProps extends React.ComponentPropsWithoutRef<"ol"> {}

export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<"li"> {}

export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  asChild?: boolean
}

export interface BreadcrumbSeparatorProps extends React.ComponentPropsWithoutRef<"li"> {}

export interface BreadcrumbPageProps extends React.ComponentPropsWithoutRef<"span"> {}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, separator = <ChevronRight className="h-4 w-4" />, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn(
          "flex items-center text-sm text-muted-foreground",
          className
        )}
        {...props}
      />
    )
  }
)
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ className, ...props }, ref) => {
    return (
      <ol
        ref={ref}
        className={cn(
          "flex flex-wrap items-center gap-1.5 break-words",
          className
        )}
        {...props}
      />
    )
  }
)
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, ...props }, ref) => {
    return (
      <li
        ref={ref}
        className={cn("inline-flex items-center gap-1.5", className)}
        {...props}
      />
    )
  }
)
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, asChild = false, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        className={cn("transition-colors hover:text-foreground", className)}
        {...props}
      >
        {props.children}
      </Link>
    )
  }
)
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbSeparator = React.forwardRef<HTMLLIElement, BreadcrumbSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <li
        ref={ref}
        className={cn("text-muted-foreground", className)}
        {...props}
      />
    )
  }
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("font-normal text-foreground", className)}
        aria-current="page"
        {...props}
      />
    )
  }
)
BreadcrumbPage.displayName = "BreadcrumbPage"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
}