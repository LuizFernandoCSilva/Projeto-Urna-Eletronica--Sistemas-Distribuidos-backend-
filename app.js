// app.js
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { encryptVoterId } from './utils/cripto.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cors());

// Configuração do transporte Nodemailer
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'luiz.fernandocsilva17@gmail.com', // Seu e-mail do Gmail
      pass: process.env.SECRET_KEY_EMAIL // Senha de app gerada no Google
    }
});

// Função para enviar o e-mail com o título de eleitor
async function sendVoterTitleEmail(email, numTitle) {
    try {
        let info = await transporter.sendMail({
            from: '"Sistema de Votação" <luiz.fernandocsilva17@gmail.com>', // Remetente
            to: email, // E-mail do destinatário
            subject: "Seu Título de Eleitor", // Assunto do e-mail
            text: `Olá, seu título de eleitor é: ${numTitle}. Guarde-o com segurança!`, // Conteúdo do e-mail
        });

        console.log("E-mail enviado: %s", info.messageId);
    } catch (error) {
        console.error("Erro ao enviar e-mail:", error);
    }
}

async function generateUniqueTitleNumber() {
    let numTitle;
    let exists;

    do {
        numTitle = (Math.floor(Math.random() * 900000) + 100000).toString();
        exists = await prisma.voters.findUnique({ where: { numTitle } });
    } while (exists);

    return numTitle;
}

app.post('/', async (req, res) => {
    try {
        const { name, cpf, email } = req.body;
        console.log("Recebendo dados:", { name, cpf, email });

        // Verifica se o eleitor já existe pelo CPF
        const existingVoter = await prisma.voters.findUnique({
            where: { cpf },
        });

        if (existingVoter) {
            console.log('Eleitor já cadastrado:', cpf);
            return res.status(400).json({ error: 'Eleitor já cadastrado.' });
        }

        // Gera um número de título de eleitor aleatório
        const numTitle = await generateUniqueTitleNumber();

        console.log("Número de título gerado:", numTitle);

        // Cria o novo eleitor
        const newVoter = await prisma.voters.create({
            data: {
                name,
                cpf,
                email, // Salvar o e-mail do usuário
                numTitle,
            },
        });

        console.log("Novo eleitor registrado:", newVoter);

        // Envia o e-mail com o título de eleitor
        await sendVoterTitleEmail(email, numTitle);

        res.status(201).json({ message: 'Eleitor registrado com sucesso.', numTitle });
    } catch (error) {
        console.error("Erro ao registrar eleitor:", error); // Log do erro completo
        res.status(500).json({ error: 'Erro ao registrar eleitor.' });
    }
});

app.post('/vote', async (req, res) => {
    try {
        const { candidate_id, numTitle } = req.body;

        // Verifica se o eleitor existe usando numTitle
        const voter = await prisma.voters.findUnique({
            where: { numTitle },
        });

        if (!voter) {
            return res.status(401).json({ error: 'Eleitor não encontrado ou título de eleitor incorreto.' });
        }

        // Verifica se o eleitor já votou
        const existingVote = await prisma.votes.findFirst({
            where: { voter_id: voter.id }, // Usando o ID do eleitor
        });

        if (existingVote) {
            return res.status(401).json({ error: 'Voto já computado.' });
        }

        const encryptedVoterId = encryptVoterId(voter.id);
        // Computa o voto
        await prisma.votes.create({
            data: {
                voter_id: encryptedVoterId, // Armazena a string criptografada
                candidate_id,
            },
        });

        res.status(201).json({ message: 'Voto computado com sucesso.' });
    } catch (error) {
        console.error("Erro ao computar voto:", error);
        res.status(500).json({ error: 'Erro ao computar voto.' });
    }
});

app.get('/results/:id?', async (req, res) => {
    try {
        const candidateId = req.params.id;

        if (candidateId) {
            // Busca os votos de um candidato específico pelo seu ID
            const candidateVotes = await prisma.votes.count({
                where: { candidate_id: candidateId }
            });
            console.log("Votos do candidato", candidateId, ":", candidateVotes);
            return res.status(200).json({
                candidate_id: candidateId,
                votes: candidateVotes
            });
        } else {
            // Agrupa os votos por candidate_id
            const voteCounts = await prisma.votes.groupBy({
                by: ['candidate_id'],
                _count: { candidate_id: true },
            });

            if (voteCounts.length === 0) {
                return res.status(200).json([]);
            }
            else{
                console.log("Resultado da votação:", voteCounts);
                return res.status(200).json({
                    results: voteCounts.map((vote) => ({
                        candidate_id: vote.candidate_id,
                        votes: vote._count.candidate_id,
                    })),
                });
            }
        }
    }
    catch (error) {
        console.error("Erro ao buscar resultados:", error);
        res.status(500).json({ error: 'Erro ao buscar resultados.' });
    }
});

export default app;
