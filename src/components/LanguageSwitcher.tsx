import { Globe } from 'lucide-react'
import { useLocale } from 'react-intlayer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import type { Locale } from 'intlayer'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()
  return (
    <div className="fixed top-4 left-4 z-50">
      <Select
        value={locale}
        onValueChange={(lang) => setLocale(lang as Locale)}
      >
        <SelectTrigger className="w-auto gap-2 bg-background">
          <Globe className="h-4 w-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">EN</SelectItem>
          <SelectItem value="ja">日本語</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
