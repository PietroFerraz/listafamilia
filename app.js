// Importando o cliente do Supabase via CDN para módulos ES
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =========================================================================
// ATENÇÃO USUÁRIO: COLOQUE SUAS CHAVES DO SUPABASE ABAIXO!
// 1. Crie um projeto no Supabase (supabase.com)
// 2. Vá em Project Settings -> API e copie a URL e a chave anon (public)
// =========================================================================
const supabaseUrl = 'https://oizxryaxmtylxiaKnapy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9penhyeWF4bXR5bHhpYWtuYXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MDk2NDIsImV4cCI6MjA5MzE4NTY0Mn0.PuhxpjkGIihJFl9RMLmzIZOZvvPJAzl_VmwKdP4goFo';

// Verifica se o usuário já colocou a chave
const isConfigured = true;

let supabase;

if (isConfigured) {
    // Inicializa o Supabase
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    // Mostra aviso na tela se não estiver configurado
    const warningEl = document.getElementById("setup-warning");
    warningEl.classList.remove("hidden");
    warningEl.innerHTML = '<p><i class="ph-bold ph-warning"></i> <strong>Supabase não configurado!</strong><br>Edite o arquivo app.js com sua URL e Chave do Supabase.</p>';
}

// Elementos da DOM
const form = document.getElementById("add-item-form");
const inputName = document.getElementById("item-name");
const selectCategory = document.getElementById("item-category");
const shoppingList = document.getElementById("shopping-list");
const itemsCount = document.getElementById("items-count");

// Nomes bonitos para as categorias
const categoryNames = {
    carnes: "Carnes",
    hortifruti: "Hortifruti",
    biscoitos: "Biscoitos & Doces",
    limpeza: "Limpeza",
    outros: "Outros"
};

// Variável para armazenar a lista localmente
let currentItems = [];

// Função para buscar os dados iniciais
async function fetchItems() {
    if (!isConfigured) return;

    const { data, error } = await supabase
        .from('compras')
        .select('*');

    if (error) {
        console.error("Erro ao buscar itens:", error);
        return;
    }

    if (data) {
        currentItems = data;
        renderList();
    }
}

// Escutar mudanças no banco de dados em TEMPO REAL
if (isConfigured) {
    // Busca inicial
    fetchItems();

    // Inscreve-se para mudanças em tempo real na tabela 'compras'
    supabase
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'compras'
            },
            (payload) => {
                // Quando houver qualquer mudança (insert, update, delete), buscamos a lista novamente
                // Para manter simples e evitar problemas de sincronia local
                fetchItems();
            }
        )
        .subscribe();
}

// Adicionar novo item
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!isConfigured) {
        alert("Por favor, configure o Supabase no arquivo app.js primeiro!");
        return;
    }

    const name = inputName.value.trim();
    const category = selectCategory.value;

    if (name && category) {
        const { error } = await supabase
            .from('compras')
            .insert([
                { name: name, category: category, completed: false }
            ]);

        if (error) {
            console.error("Erro ao adicionar:", error);
            alert("Erro ao adicionar item. Verifique as permissões da tabela.");
        } else {
            // Limpa o formulário
            inputName.value = "";
            inputName.focus();
        }
    }
});

// Função principal de renderização da lista
function renderList() {
    shoppingList.innerHTML = ""; // Limpa a lista atual

    if (currentItems.length > 0) {
        // Ordena: itens não concluídos primeiro, depois ordenados por id (ou data)
        const sortedItems = [...currentItems].sort((a, b) => {
            if (a.completed === b.completed) {
                return b.id - a.id; // Mais recentes primeiro (assumindo ID serial)
            }
            return a.completed ? 1 : -1;
        });

        // Atualiza contador
        itemsCount.textContent = `${sortedItems.length} itens`;

        // Renderiza cada item
        sortedItems.forEach(item => {
            renderItemHTML(item);
        });
    } else {
        // Lista vazia
        itemsCount.textContent = "0 itens";
        shoppingList.innerHTML = `
            <div class="empty-state">
                <i class="ph-duotone ph-basket"></i>
                <p>A lista está vazia.<br>Adicione itens acima!</p>
            </div>
        `;
    }
}

// Função para renderizar o HTML de um único item
function renderItemHTML(item) {
    const li = document.createElement("li");
    li.className = `list-item ${item.completed ? 'completed' : ''}`;

    // Define a classe da cor baseada na categoria
    const catClass = `cat-${item.category}`;

    li.innerHTML = `
        <label class="checkbox-wrapper">
            <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleItem(${item.id}, ${item.completed})">
            <span class="checkmark"></span>
        </label>
        
        <div class="item-content">
            <span class="item-name">${item.name}</span>
            <span class="item-category ${catClass}">${categoryNames[item.category] || item.category}</span>
        </div>

        <button class="delete-btn" onclick="deleteItem(${item.id})" title="Excluir">
            <i class="ph-bold ph-trash"></i>
        </button>
    `;

    shoppingList.appendChild(li);
}

// Funções globais para serem chamadas pelo HTML inline
window.toggleItem = async function (id, currentStatus) {
    if (!isConfigured) return;

    // Atualização otimista na tela
    const itemIndex = currentItems.findIndex(i => i.id === id);
    if (itemIndex > -1) {
        currentItems[itemIndex].completed = !currentStatus;
        renderList();
    }

    const { error } = await supabase
        .from('compras')
        .update({ completed: !currentStatus })
        .eq('id', id);

    if (error) console.error("Erro ao atualizar:", error);
};

window.deleteItem = async function (id) {
    if (!isConfigured) return;

    // Remoção otimista na tela
    currentItems = currentItems.filter(i => i.id !== id);
    renderList();

    const { error } = await supabase
        .from('compras')
        .delete()
        .eq('id', id);

    if (error) console.error("Erro ao deletar:", error);
};
