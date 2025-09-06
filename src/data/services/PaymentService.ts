import { TextColor } from 'data/@types/DiariaInterface';
import { PagamentoStatus } from 'data/@types/PagamentoInterface';
import { loadStripe } from '@stripe/stripe-js';
import valid from 'card-validator';

export interface CardInterface {
    card_number: string;
    card_holder_name: string;
    card_cvv: string;
    card_expiration_date: string; // MM/YY
}

export interface CardValidateInterface {
    card_number: boolean;
    card_holder_name: boolean;
    card_cvv: boolean;
    card_expiration_date: boolean;
}

let stripePromise: Promise<import('@stripe/stripe-js').Stripe | null>;

function getStripe() {
    if (!stripePromise) {
        stripePromise = loadStripe(
            process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || ''
        );
    }
    return stripePromise;
}

export const PaymentService = {
    validate(card: CardInterface): CardValidateInterface {
        return {
            card_number: valid.number(card.card_number).isValid,
            card_holder_name: card.card_holder_name.trim().length > 0,
            card_cvv: valid.cvv(card.card_cvv).isValid,
            card_expiration_date: valid
                .expirationDate(card.card_expiration_date)
                .isValid,
        };
    },
    async getHash(card: CardInterface): Promise<string> {
        const stripe = await getStripe();
        if (!stripe) {
            throw new Error('Stripe não foi carregado');
        }
        const [month, year] = card.card_expiration_date.split('/');
        const { token, error } = await stripe.createToken({
            number: card.card_number.replace(/\s+/g, ''),
            exp_month: Number(month),
            exp_year: Number(`20${year}`),
            cvc: card.card_cvv,
            name: card.card_holder_name,
        });

        if (error || !token) {
            throw new Error(error?.message || 'Erro ao gerar token');
        }

        return token.id;
    },
    getStatus(status: PagamentoStatus): { label: string; color: TextColor } {
        let label = '',
            color: TextColor = 'success';

        switch (status) {
            case PagamentoStatus.Aguardando_Transferencia:
                label = 'Aguardando Transferência';
                color = 'warning';
                break;
            case PagamentoStatus.Pago:
                label = 'Pago';
                break;
        }

        return { label, color };
    },
};
