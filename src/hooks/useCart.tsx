import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
     const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
       return JSON.parse(storagedCart);
     }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updateProduct = [...cart];
      const existsProduct = updateProduct.find(product => product.id === productId);

      // VAI PEGAR O OBJETO CORRESPONDENTE AO ID PASSADO
      const stock = await api.get(`stock/${productId}`);
      // QUANTIDADE DE PRODUTOS NO ESTOQUE
      const stockAmount = stock.data.amount;
      // QUANTIADADE ATUAL NO ESTOQUE SE O PRODUTO EXISTIR
      const currentAmount = existsProduct? existsProduct.amount : 0;
      // QUANTIDADE DESEJADA NO ESTOQUE
      const amount = currentAmount + 1;

      // QUANTIDADE DESEJADA É MAIOR DO QUE A DISPONÍVEL NO ESTOQUE
      if( amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } 

      if(existsProduct){
        //STARTANDO O PRODUTO NO CARRINHO DE COMPRAS
        existsProduct.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`);

        //COPIANDO TODAS AS PROPRIDADES QUE EXISTEM DENTRO DE PRODUCTS E PASSANDO A PROPRIEDADE AMOUNT
        const newProduct = {
          ...product.data,
          amount: 1
        }

        updateProduct.push(newProduct);
      }

      setCart(updateProduct);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateProduct));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const removedCart = [...cart];

      if(removedCart.findIndex(product => product.id === productId) >= 0){
        const updatedCart =  removedCart.filter(product => product.id !== productId)

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }else{
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if(productExists){
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }else{
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
