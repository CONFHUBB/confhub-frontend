"use client"

import { useMemo } from "react"
import countryList from "react-select-country-list"
import { Select } from "antd"

interface CountrySelectProps {
    value: string
    onValueChange: (value: string) => void
}

export function CountrySelect({ value, onValueChange }: CountrySelectProps) {
    const countries = useMemo(() => countryList().getData(), [])

    return (
        <Select
            showSearch
            optionFilterProp="label"
            className="w-full h-10"
            placeholder="Select a country"
            value={value || undefined}
            onChange={onValueChange}
            options={countries.map(c => ({ label: c.label, value: c.label }))}
        />
    )
}
