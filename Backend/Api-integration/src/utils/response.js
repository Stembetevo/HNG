export function statusSuccess(res,data,statusCode=200){
    return res.status(statusCode).json({
        status:"success",
        data
    });

}

export function statusError(res,message,statusCode=500){
    return res.status(statusCode).json({
        status:"error",
        message
    });

}