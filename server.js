import express from 'express'
import { PrismaClient } from '@prisma/client'
import e from 'express'

const prisma = new PrismaClient()
const app = express()
app.use(express.json())


app.post('/register', async (req,res)=>{

   await prisma.voters.create({
        data:{
            name: req.body.name,
            cpf: req.body.cpf,
        }
    })

    res.status(201).json(req.body)
})

app.post('/vote', async (req, res) => {
    try {
        // Verifica se o eleitor existe e se o id passado é o mesmo do eleitor
        const voter = await prisma.voters.findUnique({
            where: {
                cpf: req.body.cpf
            }
        })

        // Se o eleitor não existir ou o id passado não for o mesmo do eleitor, retorna erro
        if (!voter || voter.id !== req.body.voter_id) {
            return res.status(401).json({ error: 'Eleitor não encontrado ou não autorizado' })
        }

        // Verifica se o eleitor já votou
        const existingVote = await prisma.votes.findFirst({
            where: {
                voter_id: voter.id
            }
        })

        // Se o eleitor já votou, retorna erro
        if (existingVote) {
            return res.status(401).json({ error: 'Voto já computado' })
        }

        // Se o eleitor existe, não votou e o voto é válido, computa o voto
        await prisma.votes.create({
            data: {
                voter_id: voter.id,
                candidate_id: req.body.candidate_id
            }
        })
        res.status(201).json({ message: "Voto computado com sucesso" })
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao computar voto' })
    }
})


app.get('/results', async (req, res) => {
    try {
        const candidateId = req.query.candidate_id; // Obtém o candidate_id dos query params

        if (candidateId) {
            // Se candidate_id for fornecido, conte os votos apenas para esse candidato
            const candidateVotes = await prisma.votes.count({
                where: {
                    candidate_id: candidateId
                }
            });

            //Retornar o número de votos para o candidato específico, com o formato mais bonito
            return res.status(200).json({
                candidate_id: candidateId,
                votes: candidateVotes
            });
        } else {
            // Se nenhum candidate_id for fornecido, conte os votos para todos os candidatos
            const voteCounts = await prisma.votes.groupBy({
                by: ['candidate_id'],
                _count: {
                    candidate_id: true,
                }
            });

            // Formatar os resultados para facilitar a leitura
            const results = voteCounts.map(vote => ({
                candidate_id: vote.candidate_id,
                votes: vote._count.candidate_id
            }));

            res.status(200).json(results);
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao obter resultados' });
    }
});




app.listen(3000)
