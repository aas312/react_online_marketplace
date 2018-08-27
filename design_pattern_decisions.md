Here are the design patterns I used:
Fail early and fail loud. 
 - I used this to verify that the parameters of the transactions.  If the params passed do not satisfy the requirements of the transactions then fail.  E.g purchaseProduct check the qty is available.
Restrict Access.
- I used this to restrict access to functions. Only users with valid roles can execute the function.  E.g. addStoreOwner can only be called by admin.

Implement mortal design.
- This is done by inheriting the Destructible contract.  I can call the destroy function to remove the contract.

I didn't used other design patterns such as Circuit breaker because I did not have the time.  I would add the Circuit Breaker to this when withdrawing from the store and destroying the contract.
