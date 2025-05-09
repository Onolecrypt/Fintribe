import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBgColor: string;
  linkText?: string;
  linkHref?: string;
  isLoading?: boolean;
  extraContent?: React.ReactNode;
  onClick?: () => void;
}

export default function SummaryCard({
  title,
  value,
  icon,
  iconBgColor,
  linkText,
  linkHref = "#",
  isLoading = false,
  extraContent,
  onClick
}: SummaryCardProps) {
  return (
    <Card className="overflow-hidden shadow hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className={cn("flex-shrink-0 rounded-md p-3", iconBgColor)}>
              {icon}
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                <dd className="flex items-baseline">
                  {isLoading ? (
                    <Skeleton className="h-7 w-32" />
                  ) : (
                    <div className="flex items-center">
                      <div className="text-xl font-semibold text-gray-900">{value}</div>
                      {extraContent}
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
        
        {linkText && (
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              {onClick ? (
                <button 
                  onClick={onClick}
                  className="font-medium text-primary hover:text-blue-700"
                >
                  {linkText} <span aria-hidden="true">&rarr;</span>
                </button>
              ) : (
                <Link href={linkHref}>
                  <a className="font-medium text-primary hover:text-blue-700">
                    {linkText} <span aria-hidden="true">&rarr;</span>
                  </a>
                </Link>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
