const units: string[] = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
const teens: string[] = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const tens: string[] = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

function numberToWordsFR(n: number): string {
    if (n === 0) return "zéro";

    let words = "";

    if (Math.floor(n / 1000000) > 0) {
        const millions = Math.floor(n / 1000000);
        words += (millions === 1 ? "un million" : numberToWordsFR(millions) + " millions") + " ";
        n %= 1000000;
    }

    if (Math.floor(n / 1000) > 0) {
        const thousands = Math.floor(n / 1000);
        words += (thousands === 1 ? "mille" : numberToWordsFR(thousands) + " mille") + " ";
        n %= 1000;
    }

    if (Math.floor(n / 100) > 0) {
        const hundreds = Math.floor(n / 100);
        words += (hundreds === 1 ? "cent" : units[hundreds] + " cent") + (n % 100 !== 0 ? "" : "s") + " ";
        n %= 100;
    }
    
    if (n > 0) {
        if (n < 10) {
            words += units[n];
        } else if (n < 20) {
            words += teens[n - 10];
        } else {
            const ten = Math.floor(n / 10);
            const unit = n % 10;
            if (ten === 7 || ten === 9) {
                words += tens[ten-1] + "-" + teens[unit + 10];
            } else {
                 words += tens[ten];
                if (unit > 0) {
                    if (unit === 1 && ten < 8 && ten !== 1) {
                        words += " et " + units[unit];
                    } else {
                        words += "-" + units[unit];
                    }
                }
            }
        }
    }
    
    if (words.endsWith("quatre-vingt") && n % 10 !== 0) {
       // 's' is only for 80 itself
    } else if (words.endsWith("quatre-vingt")) {
        words += "s";
    }

    return words.trim().replace(/\s+/g, ' ');
}

export function convertAmountToWords(amount: number): string {
    if (isNaN(amount) || amount < 0) {
        return "Montant invalide";
    }

    const dirhams = Math.floor(amount);
    const centimes = Math.round((amount - dirhams) * 100);

    let result = "";

    if (dirhams > 0) {
        result += numberToWordsFR(dirhams);
        result += " DIRHAMS";
    }

    if (centimes > 0) {
        if (dirhams > 0) {
            result += ", ";
        }
        result += numberToWordsFR(centimes);
        result += " CENTIMES";
    }

    if (dirhams === 0 && centimes === 0) {
        return "Zéro dirham";
    }

    return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
}
