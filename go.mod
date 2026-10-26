// Root module only for the Vercel function in api/; the backend lives in its own module.
module infection-risk-calculator

go 1.23

require infection-risk-calculator-be v0.0.0

replace infection-risk-calculator-be => ./infection-risk-calculator-be
